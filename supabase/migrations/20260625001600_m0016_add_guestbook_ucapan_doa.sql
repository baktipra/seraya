-- SRY-027 / M0016
-- Private-by-design guestbook. Messages are live interaction data tied to one
-- active guest capability, never invitation snapshot content or public data.

begin;

create table public.guestbook_entries (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references public.guests (id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint guestbook_entries_message_length check (char_length(message) between 1 and 600),
  constraint guestbook_entries_message_not_whitespace check (message !~ '^[[:space:]]*$')
);

-- A guest can have one currently visible entry. Soft removal intentionally
-- frees the capability to submit a fresh message later.
create unique index guestbook_entries_one_active_per_guest_idx
on public.guestbook_entries (guest_id)
where deleted_at is null;

-- Supports both the personal capability lookup and owner inbox ordering.
create index guestbook_entries_guest_active_updated_idx
on public.guestbook_entries (guest_id, updated_at desc)
where deleted_at is null;

create function public.normalize_guestbook_entry_message()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  new.message := regexp_replace(new.message, '(^[[:space:]]+|[[:space:]]+$)', '', 'g');
  return new;
end;
$$;

revoke all on function public.normalize_guestbook_entry_message() from public, anon, authenticated;

create trigger guestbook_entries_normalize_message
before insert or update of message on public.guestbook_entries
for each row
execute function public.normalize_guestbook_entry_message();

create trigger guestbook_entries_set_updated_at
before update on public.guestbook_entries
for each row
execute function public.set_updated_at();

alter table public.guestbook_entries enable row level security;

-- Browser roles cannot enumerate or mutate guestbook records directly. Owners
-- receive active entries through their normal authenticated dashboard scope;
-- personal recipients write only through the narrow capability function below.
revoke all on table public.guestbook_entries from anon, authenticated;
grant select on table public.guestbook_entries to authenticated;

create policy guestbook_entries_select_own_project
on public.guestbook_entries
for select
to authenticated
using (
  guestbook_entries.deleted_at is null
  and exists (
    select 1
    from public.guests as guest
    join public.wedding_projects as project
      on project.id = guest.project_id
    where guest.id = guestbook_entries.guest_id
      and guest.deleted_at is null
      and project.account_id = (select auth.uid())
      and project.deleted_at is null
  )
);

-- Returns only the current recipient's own message. The resolver repeats the
-- active-link/current-snapshot policy and never returns a guest ID, token hash,
-- project ID, or another guest's content.
create function public.resolve_personal_guestbook_entry(
  requested_slug text,
  raw_token text
)
returns table (
  message text,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare
  requested_token_hash text;
begin
  if requested_slug is null
    or requested_slug <> lower(requested_slug)
    or char_length(requested_slug) not between 3 and 96
    or requested_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    or raw_token is null
    or char_length(raw_token) not between 43 and 128
    or raw_token !~ '^[A-Za-z0-9_-]+$' then
    return;
  end if;

  requested_token_hash := encode(extensions.digest(raw_token, 'sha256'), 'hex');

  return query
  select entry.message, entry.updated_at
  from public.guest_links as link
  join public.guests as guest
    on guest.id = link.guest_id
  join public.wedding_projects as project
    on project.id = guest.project_id
  join public.published_invitation_snapshots as published_snapshot
    on published_snapshot.project_id = project.id
  left join public.guestbook_entries as entry
    on entry.guest_id = guest.id
    and entry.deleted_at is null
  where link.token_hash = requested_token_hash
    and link.status = 'active'::public.guest_link_status
    and guest.deleted_at is null
    and project.deleted_at is null
    and project.status = 'published'::public.project_status
    and project.slug = requested_slug
    and published_snapshot.is_current
    and published_snapshot.slug::text = requested_slug
  limit 1;
end;
$$;

-- Atomic anonymous-safe upsert. Identity is derived exclusively from an active
-- bearer capability after hashing it inside the database. A short per-guest
-- write window absorbs rapid repeated submits without storing a raw token or a
-- separate tracking record.
create function public.submit_personal_guestbook_entry(
  requested_slug text,
  raw_token text,
  requested_message text
)
returns text
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  requested_token_hash text;
  target_guest_id uuid;
  normalized_message text;
  existing_entry public.guestbook_entries%rowtype;
  result_state text;
begin
  if requested_slug is null
    or requested_slug <> lower(requested_slug)
    or char_length(requested_slug) not between 3 and 96
    or requested_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    or raw_token is null
    or char_length(raw_token) not between 43 and 128
    or raw_token !~ '^[A-Za-z0-9_-]+$'
    or requested_message is null then
    return null;
  end if;

  normalized_message := regexp_replace(requested_message, '(^[[:space:]]+|[[:space:]]+$)', '', 'g');

  if char_length(normalized_message) not between 1 and 600 then
    return null;
  end if;

  requested_token_hash := encode(extensions.digest(raw_token, 'sha256'), 'hex');

  select guest.id
  into target_guest_id
  from public.guest_links as link
  join public.guests as guest
    on guest.id = link.guest_id
  join public.wedding_projects as project
    on project.id = guest.project_id
  join public.published_invitation_snapshots as published_snapshot
    on published_snapshot.project_id = project.id
  where link.token_hash = requested_token_hash
    and link.status = 'active'::public.guest_link_status
    and guest.deleted_at is null
    and project.deleted_at is null
    and project.status = 'published'::public.project_status
    and project.slug = requested_slug
    and published_snapshot.is_current
    and published_snapshot.slug::text = requested_slug
  for update of guest
  limit 1;

  if not found then
    return null;
  end if;

  select *
  into existing_entry
  from public.guestbook_entries as entry
  where entry.guest_id = target_guest_id
    and entry.deleted_at is null
  for update;

  if found then
    -- A small server-side limit applies only to repeated updates for the same
    -- resolved guest. It stores no token or content history.
    if existing_entry.updated_at > now() - interval '3 seconds' then
      return null;
    end if;

    update public.guestbook_entries
    set message = normalized_message
    where id = existing_entry.id
      and deleted_at is null;

    result_state := 'updated';
  else
    insert into public.guestbook_entries (guest_id, message)
    values (target_guest_id, normalized_message);

    result_state := 'created';
  end if;

  return result_state;
end;
$$;

revoke all on function public.resolve_personal_guestbook_entry(text, text) from public;
revoke all on function public.submit_personal_guestbook_entry(text, text, text) from public;
grant execute on function public.resolve_personal_guestbook_entry(text, text) to anon, authenticated;
grant execute on function public.submit_personal_guestbook_entry(text, text, text) to anon, authenticated;

commit;
