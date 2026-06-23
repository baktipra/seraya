-- SRY-010 / M0009
-- Payment attempt foundation only. Verified webhook status changes and payment
-- gated publication deliberately remain outside this migration/ticket.

begin;

create table public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.wedding_projects (id) on delete cascade,
  provider text not null,
  provider_order_id text not null unique,
  product_code text not null,
  pricing_version text not null,
  amount_idr bigint not null,
  currency text not null default 'IDR',
  status public.payment_status not null default 'created',
  provider_checkout_url text,
  provider_transaction_id text,
  provider_payment_type text,
  provider_status text,
  checkout_started_at timestamptz,
  expires_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_transactions_provider_valid check (provider = 'midtrans_snap'),
  constraint payment_transactions_product_code_valid check (product_code = 'invitation_activation'),
  constraint payment_transactions_amount_idr_valid check (amount_idr > 0),
  constraint payment_transactions_currency_valid check (currency = 'IDR')
);

create unique index payment_transactions_one_active_attempt_per_project_product_idx
on public.payment_transactions (project_id, product_code)
where status in ('created'::public.payment_status, 'pending'::public.payment_status);

create index payment_transactions_project_active_lookup_idx
on public.payment_transactions (project_id, created_at desc)
where status in ('created'::public.payment_status, 'pending'::public.payment_status);

create trigger payment_transactions_set_updated_at
before update on public.payment_transactions
for each row
execute function public.set_updated_at();

-- Checkout rows are immutable commercial records. SRY-010 only creates a
-- pending attempt; paid/expired/cancelled/refunded transitions are reserved for
-- the later verified webhook migration.
create function public.enforce_payment_transaction_lifecycle()
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

  if new.status in (
    'paid'::public.payment_status,
    'expired'::public.payment_status,
    'cancelled'::public.payment_status,
    'refunded'::public.payment_status
  ) then
    raise exception using
      errcode = '22023',
      message = 'Verified payment status transitions are not available yet.';
  end if;

  if old.status = 'created'::public.payment_status then
    if new.status not in (
      'created'::public.payment_status,
      'pending'::public.payment_status,
      'failed'::public.payment_status
    ) then
      raise exception using
        errcode = '22023',
        message = 'Invalid payment transaction lifecycle transition.';
    end if;

    return new;
  end if;

  if old.status = 'pending'::public.payment_status then
    if new.status <> 'pending'::public.payment_status then
      raise exception using
        errcode = '22023',
        message = 'Pending payments await verified provider confirmation.';
    end if;

    return new;
  end if;

  if old.status = 'failed'::public.payment_status then
    if new.status <> 'failed'::public.payment_status then
      raise exception using
        errcode = '55000',
        message = 'Failed payment attempts are immutable.';
    end if;

    return new;
  end if;

  raise exception using
    errcode = '55000',
    message = 'Payment transaction status is not mutable in this release.';
end;
$$;

revoke all on function public.enforce_payment_transaction_lifecycle() from public, anon, authenticated;

create trigger payment_transactions_enforce_lifecycle
before insert or update on public.payment_transactions
for each row
execute function public.enforce_payment_transaction_lifecycle();

alter table public.payment_transactions enable row level security;

revoke all on table public.payment_transactions from anon, authenticated;
grant select on table public.payment_transactions to authenticated;

create policy payment_transactions_select_own_project
on public.payment_transactions
for select
to authenticated
using (
  exists (
    select 1
    from public.wedding_projects as project
    where project.id = payment_transactions.project_id
      and project.account_id = (select auth.uid())
      and project.deleted_at is null
  )
);

-- Server-only reserve step. The caller identity is supplied by the server only
-- after session ownership verification. The function is intentionally not
-- executable by browser roles; it serializes a project row before either
-- finding a reusable active attempt or making one opaque new order ID.
create function public.reserve_payment_checkout_attempt(
  target_project_id uuid,
  expected_owner_id uuid,
  target_product_code text,
  target_pricing_version text,
  target_amount_idr bigint,
  target_currency text
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
  checkout_started_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz,
  created_now boolean
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  target_project public.wedding_projects%rowtype;
  active_attempt public.payment_transactions%rowtype;
  reserved_attempt public.payment_transactions%rowtype;
begin
  if target_product_code <> 'invitation_activation'
    or target_currency <> 'IDR'
    or target_amount_idr <= 0
    or nullif(btrim(target_pricing_version), '') is null
  then
    raise exception using
      errcode = '22023',
      message = 'Payment checkout configuration is invalid.';
  end if;

  select *
  into target_project
  from public.wedding_projects as project
  where project.id = target_project_id
    and project.deleted_at is null
  for update;

  if not found or target_project.account_id <> expected_owner_id then
    raise exception using
      errcode = '42501',
      message = 'Project is not available for payment checkout.';
  end if;

  select *
  into active_attempt
  from public.payment_transactions as attempt
  where attempt.project_id = target_project.id
    and attempt.product_code = target_product_code
    and attempt.status in ('created'::public.payment_status, 'pending'::public.payment_status)
  order by attempt.created_at desc
  limit 1
  for update;

  if found then
    return query
    select
      active_attempt.id,
      active_attempt.project_id,
      active_attempt.provider,
      active_attempt.provider_order_id,
      active_attempt.product_code,
      active_attempt.pricing_version,
      active_attempt.amount_idr,
      active_attempt.currency,
      active_attempt.status,
      active_attempt.provider_checkout_url,
      active_attempt.checkout_started_at,
      active_attempt.expires_at,
      active_attempt.created_at,
      false;
    return;
  end if;

  insert into public.payment_transactions (
    project_id,
    provider,
    provider_order_id,
    product_code,
    pricing_version,
    amount_idr,
    currency,
    status
  )
  values (
    target_project.id,
    'midtrans_snap',
    'sry-pay-' || gen_random_uuid()::text,
    target_product_code,
    target_pricing_version,
    target_amount_idr,
    target_currency,
    'created'::public.payment_status
  )
  returning * into reserved_attempt;

  return query
  select
    reserved_attempt.id,
    reserved_attempt.project_id,
    reserved_attempt.provider,
    reserved_attempt.provider_order_id,
    reserved_attempt.product_code,
    reserved_attempt.pricing_version,
    reserved_attempt.amount_idr,
    reserved_attempt.currency,
    reserved_attempt.status,
    reserved_attempt.provider_checkout_url,
    reserved_attempt.checkout_started_at,
    reserved_attempt.expires_at,
    reserved_attempt.created_at,
    true;
end;
$$;

revoke all on function public.reserve_payment_checkout_attempt(uuid, uuid, text, text, bigint, text)
from public, anon, authenticated;

create function public.start_payment_checkout_attempt(
  target_payment_id uuid,
  target_checkout_url text,
  target_expires_at timestamptz default null
)
returns public.payment_transactions
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  updated_attempt public.payment_transactions%rowtype;
begin
  if nullif(btrim(target_checkout_url), '') is null then
    raise exception using
      errcode = '22023',
      message = 'Payment checkout URL is required.';
  end if;

  update public.payment_transactions as attempt
  set
    status = 'pending'::public.payment_status,
    provider_checkout_url = target_checkout_url,
    checkout_started_at = now(),
    expires_at = target_expires_at
  where attempt.id = target_payment_id
    and attempt.status = 'created'::public.payment_status
  returning * into updated_attempt;

  if not found then
    raise exception using
      errcode = '22023',
      message = 'Payment attempt is not available to start checkout.';
  end if;

  return updated_attempt;
end;
$$;

revoke all on function public.start_payment_checkout_attempt(uuid, text, timestamptz)
from public, anon, authenticated;

create function public.fail_payment_checkout_attempt(target_payment_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  update public.payment_transactions as attempt
  set status = 'failed'::public.payment_status
  where attempt.id = target_payment_id
    and attempt.status = 'created'::public.payment_status;
end;
$$;

revoke all on function public.fail_payment_checkout_attempt(uuid)
from public, anon, authenticated;

commit;
