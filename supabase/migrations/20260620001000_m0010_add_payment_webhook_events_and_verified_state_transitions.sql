-- SRY-011A / M0010
-- Verified Midtrans notification ledger and trusted payment state transitions.
-- Browser return routes remain informational only; all paid state changes originate
-- in the verified webhook service calling the controlled database function below.

begin;

create table public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  payment_transaction_id uuid not null references public.payment_transactions (id) on delete cascade,
  provider text not null,
  provider_order_id text not null,
  event_fingerprint text not null unique,
  provider_transaction_status text not null,
  provider_status_code text not null,
  provider_transaction_id text,
  provider_payment_type text,
  applied_payment_status public.payment_status,
  received_at timestamptz not null default now(),
  processed_at timestamptz not null default now(),
  constraint payment_webhook_events_provider_valid check (provider = 'midtrans_snap'),
  constraint payment_webhook_events_fingerprint_sha256 check (event_fingerprint ~ '^[a-f0-9]{64}$'),
  constraint payment_webhook_events_order_id_valid check (nullif(btrim(provider_order_id), '') is not null),
  constraint payment_webhook_events_transaction_status_valid check (
    nullif(btrim(provider_transaction_status), '') is not null
  ),
  constraint payment_webhook_events_status_code_valid check (nullif(btrim(provider_status_code), '') is not null)
);

create index payment_webhook_events_payment_transaction_idx
on public.payment_webhook_events (payment_transaction_id, received_at desc);

alter table public.payment_webhook_events enable row level security;
revoke all on table public.payment_webhook_events from anon, authenticated;

-- M0009 intentionally blocked verified final states. Replace only its lifecycle
-- guard so verified transitions can happen inside the narrowly controlled
-- `apply_verified_midtrans_payment_webhook` function. Commercial values remain
-- immutable on every update.
create or replace function public.enforce_payment_transaction_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'created'::public.payment_status then
      raise exception using
        errcode = '22023',
        message = 'Payment attempts must begin in created state.';
    end if;

    return new;
  end if;

  if new.project_id is distinct from old.project_id
    or new.provider is distinct from old.provider
    or new.provider_order_id is distinct from old.provider_order_id
    or new.product_code is distinct from old.product_code
    or new.pricing_version is distinct from old.pricing_version
    or new.amount_idr is distinct from old.amount_idr
    or new.currency is distinct from old.currency
    or new.created_at is distinct from old.created_at
  then
    raise exception using
      errcode = '55000',
      message = 'Payment transaction commercial fields are immutable.';
  end if;

  if new.status = old.status then
    return new;
  end if;

  if old.status = 'created'::public.payment_status
    and new.status in ('pending'::public.payment_status, 'failed'::public.payment_status)
  then
    return new;
  end if;

  if current_setting('seraya.verified_payment_transition', true) = 'true'
    and (
      (old.status = 'pending'::public.payment_status and new.status in (
        'paid'::public.payment_status,
        'failed'::public.payment_status,
        'expired'::public.payment_status,
        'cancelled'::public.payment_status
      ))
      or (old.status = 'paid'::public.payment_status and new.status = 'refunded'::public.payment_status)
    )
  then
    return new;
  end if;

  raise exception using
    errcode = '22023',
    message = 'Invalid payment transaction lifecycle transition.';
end;
$$;

revoke all on function public.enforce_payment_transaction_lifecycle() from public, anon, authenticated;

-- This is intentionally server-only: the webhook route verifies Midtrans'
-- signature before invoking it through the service-role client. It atomically
-- records a redacted, canonical event ledger row and applies only a permitted,
-- non-regressing status transition.
create function public.apply_verified_midtrans_payment_webhook(
  target_provider_order_id text,
  target_amount_idr bigint,
  target_currency text,
  target_event_fingerprint text,
  target_provider_transaction_status text,
  target_provider_status_code text,
  target_provider_transaction_id text default null,
  target_provider_payment_type text default null,
  target_payment_status public.payment_status default null
)
returns table (
  id uuid,
  project_id uuid,
  provider text,
  provider_order_id text,
  product_code text,
  pricing_version text,
  amount_idr bigint,
  currency text,
  status public.payment_status,
  provider_checkout_url text,
  provider_transaction_id text,
  provider_payment_type text,
  provider_status text,
  checkout_started_at timestamptz,
  expires_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  webhook_event_id uuid,
  duplicate boolean,
  applied_payment_status public.payment_status
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  matched_payment public.payment_transactions%rowtype;
  updated_payment public.payment_transactions%rowtype;
  new_event_id uuid;
  was_duplicate boolean := false;
  applied_status public.payment_status := null;
begin
  if nullif(btrim(target_provider_order_id), '') is null
    or target_amount_idr <= 0
    or nullif(btrim(target_event_fingerprint), '') is null
    or target_event_fingerprint !~ '^[a-f0-9]{64}$'
    or nullif(btrim(target_provider_transaction_status), '') is null
    or nullif(btrim(target_provider_status_code), '') is null
  then
    raise exception using
      errcode = '22023',
      message = 'Verified payment webhook data is invalid.';
  end if;

  if target_currency is not null and target_currency <> 'IDR' then
    raise exception using
      errcode = '22023',
      message = 'Verified payment currency is invalid.';
  end if;

  select attempt.*
  into matched_payment
  from public.payment_transactions as attempt
  join public.wedding_projects as project on project.id = attempt.project_id
  where attempt.provider_order_id = target_provider_order_id
    and attempt.provider = 'midtrans_snap'
    and attempt.amount_idr = target_amount_idr
    and attempt.currency = 'IDR'
    and project.deleted_at is null
  for update of attempt;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Payment transaction is not available for this webhook.';
  end if;

  begin
    insert into public.payment_webhook_events (
      payment_transaction_id,
      provider,
      provider_order_id,
      event_fingerprint,
      provider_transaction_status,
      provider_status_code,
      provider_transaction_id,
      provider_payment_type,
      applied_payment_status
    )
    values (
      matched_payment.id,
      'midtrans_snap',
      target_provider_order_id,
      target_event_fingerprint,
      target_provider_transaction_status,
      target_provider_status_code,
      nullif(btrim(target_provider_transaction_id), ''),
      nullif(btrim(target_provider_payment_type), ''),
      null
    )
    returning payment_webhook_events.id into new_event_id;
  exception
    when unique_violation then
      was_duplicate := true;
  end;

  if was_duplicate then
    return query
    select
      matched_payment.id,
      matched_payment.project_id,
      matched_payment.provider,
      matched_payment.provider_order_id,
      matched_payment.product_code,
      matched_payment.pricing_version,
      matched_payment.amount_idr,
      matched_payment.currency,
      matched_payment.status,
      matched_payment.provider_checkout_url,
      matched_payment.provider_transaction_id,
      matched_payment.provider_payment_type,
      matched_payment.provider_status,
      matched_payment.checkout_started_at,
      matched_payment.expires_at,
      matched_payment.paid_at,
      matched_payment.created_at,
      matched_payment.updated_at,
      null::uuid,
      true,
      null::public.payment_status;
    return;
  end if;

  if target_payment_status is not null and target_payment_status <> matched_payment.status then
    if (
      (matched_payment.status = 'created'::public.payment_status and target_payment_status in (
        'pending'::public.payment_status,
        'failed'::public.payment_status
      ))
      or (matched_payment.status = 'pending'::public.payment_status and target_payment_status in (
        'paid'::public.payment_status,
        'failed'::public.payment_status,
        'expired'::public.payment_status,
        'cancelled'::public.payment_status
      ))
      or (matched_payment.status = 'paid'::public.payment_status and target_payment_status = 'refunded'::public.payment_status)
    ) then
      perform set_config('seraya.verified_payment_transition', 'true', true);

      update public.payment_transactions as attempt
      set
        status = target_payment_status,
        provider_transaction_id = nullif(btrim(target_provider_transaction_id), ''),
        provider_payment_type = nullif(btrim(target_provider_payment_type), ''),
        provider_status = target_provider_transaction_status,
        paid_at = case
          when target_payment_status = 'paid'::public.payment_status
            and attempt.paid_at is null then now()
          else attempt.paid_at
        end
      where attempt.id = matched_payment.id
      returning * into updated_payment;

      applied_status := target_payment_status;
    else
      update public.payment_transactions as attempt
      set
        provider_transaction_id = coalesce(nullif(btrim(target_provider_transaction_id), ''), attempt.provider_transaction_id),
        provider_payment_type = coalesce(nullif(btrim(target_provider_payment_type), ''), attempt.provider_payment_type),
        provider_status = target_provider_transaction_status
      where attempt.id = matched_payment.id
      returning * into updated_payment;
    end if;
  else
    update public.payment_transactions as attempt
    set
      provider_transaction_id = coalesce(nullif(btrim(target_provider_transaction_id), ''), attempt.provider_transaction_id),
      provider_payment_type = coalesce(nullif(btrim(target_provider_payment_type), ''), attempt.provider_payment_type),
      provider_status = target_provider_transaction_status
    where attempt.id = matched_payment.id
    returning * into updated_payment;
  end if;

  update public.payment_webhook_events
  set applied_payment_status = applied_status
  where payment_webhook_events.id = new_event_id;

  return query
  select
    updated_payment.id,
    updated_payment.project_id,
    updated_payment.provider,
    updated_payment.provider_order_id,
    updated_payment.product_code,
    updated_payment.pricing_version,
    updated_payment.amount_idr,
    updated_payment.currency,
    updated_payment.status,
    updated_payment.provider_checkout_url,
    updated_payment.provider_transaction_id,
    updated_payment.provider_payment_type,
    updated_payment.provider_status,
    updated_payment.checkout_started_at,
    updated_payment.expires_at,
    updated_payment.paid_at,
    updated_payment.created_at,
    updated_payment.updated_at,
    new_event_id,
    false,
    applied_status;
end;
$$;

revoke all on function public.apply_verified_midtrans_payment_webhook(
  text, bigint, text, text, text, text, text, text, public.payment_status
) from public, anon, authenticated;

commit;
