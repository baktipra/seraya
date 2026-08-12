-- SERAYA — J1.5A / J1.5B
-- Explicit guest consent + owner moderation for personal-only shared wishes.
-- Existing guestbook behavior remains private by default and the original
-- M0016 RPCs remain available during the rollout.

begin;

alter table public.guestbook_entries
  add column if not exists share_with_guests boolean not null default false,
  add column if not exists hidden_from_guest_feed boolean not null default false;

-- Existing rows intentionally remain private because share_with_guests defaults false.
create index if not exists guestbook_entries_shared_feed_idx
on public.guestbook_entries (created_at desc, guest_id)
where deleted_at is null
  and share_with_guests = true
  and hidden_from_guest_feed = false;

create or replace function public.resolve_personal_guestbook_entry_v2(
  requested_slug text,
  raw_token text
)
returns table (
  message text,
  share_with_guests boolean,
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
  select
    entry.message,
    coalesce(entry.share_with_guests, false),
    entry.updated_at
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

create or replace function public.submit_personal_guestbook_entry_v2(
  requested_slug text,
  raw_token text,
  requested_message text,
  requested_share_with_guests boolean
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
    or requested_message is null
    or requested_share_with_guests is null then
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
    if existing_entry.updated_at > now() - interval '3 seconds' then
      return null;
    end if;

    update public.guestbook_entries
    set
      message = normalized_message,
      share_with_guests = requested_share_with_guests
    where id = existing_entry.id
      and deleted_at is null;

    result_state := 'updated';
  else
    insert into public.guestbook_entries (
      guest_id,
      message,
      share_with_guests
    )
    values (
      target_guest_id,
      normalized_message,
      requested_share_with_guests
    );

    result_state := 'created';
  end if;

  return result_state;
end;
$$;

create or replace function public.list_personal_guestbook_shared_wishes(
  requested_slug text,
  raw_token text,
  requested_limit integer default 12,
  requested_offset integer default 0
)
returns table (
  display_name text,
  message text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare
  requested_token_hash text;
  reader_project_id uuid;
  bounded_limit integer;
  bounded_offset integer;
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

  bounded_limit := least(greatest(coalesce(requested_limit, 12), 1), 24);
  bounded_offset := least(greatest(coalesce(requested_offset, 0), 0), 1000);
  requested_token_hash := encode(extensions.digest(raw_token, 'sha256'), 'hex');

  select project.id
  into reader_project_id
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
  limit 1;

  if reader_project_id is null then
    return;
  end if;

  return query
  select
    guest.display_name,
    entry.message,
    entry.created_at
  from public.guestbook_entries as entry
  join public.guests as guest
    on guest.id = entry.guest_id
  where guest.project_id = reader_project_id
    and guest.deleted_at is null
    and entry.deleted_at is null
    and entry.share_with_guests = true
    and entry.hidden_from_guest_feed = false
  order by entry.created_at desc, entry.id desc
  limit bounded_limit
  offset bounded_offset;
end;
$$;

create or replace function public.set_guestbook_entry_feed_hidden(
  target_project_id uuid,
  target_entry_id uuid,
  requested_hidden boolean
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  affected_rows integer;
begin
  if (select auth.uid()) is null
    or target_project_id is null
    or target_entry_id is null
    or requested_hidden is null then
    return false;
  end if;

  if not exists (
    select 1
    from public.wedding_projects as project
    where project.id = target_project_id
      and project.account_id = (select auth.uid())
      and project.deleted_at is null
  ) then
    return false;
  end if;

  update public.guestbook_entries as entry
  set hidden_from_guest_feed = requested_hidden
  from public.guests as guest
  where entry.id = target_entry_id
    and entry.guest_id = guest.id
    and guest.project_id = target_project_id
    and guest.deleted_at is null
    and entry.deleted_at is null
    and entry.share_with_guests = true;

  get diagnostics affected_rows = row_count;
  return affected_rows = 1;
end;
$$;

revoke all on function public.resolve_personal_guestbook_entry_v2(text, text) from public, anon, authenticated;
revoke all on function public.submit_personal_guestbook_entry_v2(text, text, text, boolean) from public, anon, authenticated;
revoke all on function public.list_personal_guestbook_shared_wishes(text, text, integer, integer) from public, anon, authenticated;
revoke all on function public.set_guestbook_entry_feed_hidden(uuid, uuid, boolean) from public, anon, authenticated;

grant execute on function public.resolve_personal_guestbook_entry_v2(text, text) to anon, authenticated;
grant execute on function public.submit_personal_guestbook_entry_v2(text, text, text, boolean) to anon, authenticated;
grant execute on function public.list_personal_guestbook_shared_wishes(text, text, integer, integer) to anon, authenticated;
grant execute on function public.set_guestbook_entry_feed_hidden(uuid, uuid, boolean) to authenticated;

commit;