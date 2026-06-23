-- SRY-013 / M0013
-- Private bearer-capability guest links and anonymous RSVP mutation. Raw link
-- tokens never enter a table: only a SHA-256 lowercase hexadecimal digest is
-- stored. Public access is available only through narrow security-definer
-- resolver/mutation functions.

begin;

create table public.guest_links (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references public.guests (id) on delete cascade,
  token_hash text not null,
  status public.guest_link_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint guest_links_token_hash_sha256_hex check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint guest_links_revoked_at_matches_status check (
    (status = 'active'::public.guest_link_status and revoked_at is null)
    or (status <> 'active'::public.guest_link_status and revoked_at is not null)
  )
);

create unique index guest_links_token_hash_unique_idx
on public.guest_links (token_hash);

create unique index guest_links_one_active_per_guest_idx
on public.guest_links (guest_id)
where status = 'active'::public.guest_link_status;

-- Covers private owner-side state loading after the server has already verified
-- the enclosing project and active guest list.
create index guest_links_guest_state_lookup_idx
on public.guest_links (guest_id, created_at desc);

-- Supports the public capability lookup without revealing the table itself.
create index guest_links_active_token_lookup_idx
on public.guest_links (token_hash)
where status = 'active'::public.guest_link_status;

create function public.set_guest_link_revoked_at()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if old.status = 'active'::public.guest_link_status
    and new.status <> 'active'::public.guest_link_status
    and new.revoked_at is null then
    new.revoked_at := now();
  end if;

  return new;
end;
$$;

revoke all on function public.set_guest_link_revoked_at() from public, anon, authenticated;

create trigger guest_links_set_revoked_at
before update of status, revoked_at on public.guest_links
for each row
execute function public.set_guest_link_revoked_at();

create trigger guest_links_set_updated_at
before update on public.guest_links
for each row
execute function public.set_updated_at();

alter table public.guest_links enable row level security;

-- Browser roles receive no table access. Server-only owner operations use the
-- service-role boundary after application-level ownership checks; anonymous
-- recipients can only call the two narrow capability functions below.
revoke all on table public.guest_links from anon, authenticated;

-- A soft-removed guest may never retain a usable bearer URL. The public resolver
-- independently checks deleted_at too, so this trigger is defense in depth.
create function public.revoke_active_guest_links_on_guest_soft_remove()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if old.deleted_at is null and new.deleted_at is not null then
    update public.guest_links
    set status = 'revoked'::public.guest_link_status,
        revoked_at = coalesce(revoked_at, now())
    where guest_id = new.id
      and status = 'active'::public.guest_link_status;
  end if;

  return new;
end;
$$;

revoke all on function public.revoke_active_guest_links_on_guest_soft_remove() from public, anon, authenticated;

create trigger guests_revoke_active_links_on_soft_remove
before update of deleted_at on public.guests
for each row
execute function public.revoke_active_guest_links_on_guest_soft_remove();

-- The service role is the only caller for owner-created/replaced/revoked links.
-- The surrounding Server Action authenticates the owner and verifies project and
-- guest ownership before reaching these atomic functions. No raw token reaches
-- either function; only a validated SHA-256 digest is accepted.
create function public.replace_personal_guest_link_for_server(
  target_guest_id uuid,
  new_token_hash text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  target_guest public.guests%rowtype;
  new_link_id uuid;
begin
  if new_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception using
      errcode = '22023',
      message = 'Guest link token hash is invalid.';
  end if;

  select *
  into target_guest
  from public.guests as guest
  where guest.id = target_guest_id
    and guest.deleted_at is null
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Active guest is not available for a personal link.';
  end if;

  -- Locking the guest serializes replacement/revocation with public RSVP and
  -- guarantees the prior active capability is invalidated before insertion.
  update public.guest_links
  set status = 'revoked'::public.guest_link_status,
      revoked_at = coalesce(revoked_at, now())
  where guest_id = target_guest.id
    and status = 'active'::public.guest_link_status;

  insert into public.guest_links (guest_id, token_hash)
  values (target_guest.id, new_token_hash)
  returning id into new_link_id;

  return new_link_id;
end;
$$;

create function public.revoke_personal_guest_link_for_server(target_guest_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  target_guest public.guests%rowtype;
  revoked_link_id uuid;
begin
  select *
  into target_guest
  from public.guests as guest
  where guest.id = target_guest_id
    and guest.deleted_at is null
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Active guest is not available for personal-link revocation.';
  end if;

  update public.guest_links
  set status = 'revoked'::public.guest_link_status,
      revoked_at = coalesce(revoked_at, now())
  where guest_id = target_guest.id
    and status = 'active'::public.guest_link_status
  returning id into revoked_link_id;

  return revoked_link_id is not null;
end;
$$;

revoke all on function public.replace_personal_guest_link_for_server(uuid, text) from public, anon, authenticated;
revoke all on function public.revoke_personal_guest_link_for_server(uuid) from public, anon, authenticated;

-- Supabase provides service_role in deployed environments; PGlite intentionally
-- does not. Keep the production grant explicit without coupling test setup to a
-- non-existent role.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function public.replace_personal_guest_link_for_server(uuid, text) to service_role';
    execute 'grant execute on function public.revoke_personal_guest_link_for_server(uuid) to service_role';
  end if;
end;
$$;

-- Anonymous resolution is intentionally a single narrow response: a current
-- immutable snapshot plus the linked guest's display name and RSVP state. It
-- returns no identifiers, hashes, ownership, payment, or draft metadata.
create function public.resolve_personal_guest_invitation(
  requested_slug text,
  raw_token text
)
returns table (
  guest_display_name text,
  rsvp_status public.rsvp_status,
  snapshot jsonb,
  template_id text
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
    guest.display_name,
    guest.rsvp_status,
    published_snapshot.snapshot,
    published_snapshot.template_id
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
end;
$$;

-- Public RSVP repeats capability resolution and current-snapshot policy rather
-- than trusting a previously rendered page. Only attending/declined are valid
-- recipient choices; pending remains an initial database-only state.
create function public.submit_personal_guest_rsvp(
  requested_slug text,
  raw_token text,
  requested_status public.rsvp_status
)
returns public.rsvp_status
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  requested_token_hash text;
  target_guest_id uuid;
  updated_status public.rsvp_status;
begin
  if requested_status not in ('attending'::public.rsvp_status, 'declined'::public.rsvp_status)
    or requested_slug is null
    or requested_slug <> lower(requested_slug)
    or char_length(requested_slug) not between 3 and 96
    or requested_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    or raw_token is null
    or char_length(raw_token) not between 43 and 128
    or raw_token !~ '^[A-Za-z0-9_-]+$' then
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
    and published_snapshot.snapshot #> '{draft,rsvp,enabled}' = 'true'::jsonb
  for update of guest
  limit 1;

  if not found then
    return null;
  end if;

  update public.guests
  set rsvp_status = requested_status
  where id = target_guest_id
    and deleted_at is null
  returning rsvp_status into updated_status;

  return updated_status;
end;
$$;

revoke all on function public.resolve_personal_guest_invitation(text, text) from public;
revoke all on function public.submit_personal_guest_rsvp(text, text, public.rsvp_status) from public;
grant execute on function public.resolve_personal_guest_invitation(text, text) to anon, authenticated;
grant execute on function public.submit_personal_guest_rsvp(text, text, public.rsvp_status) to anon, authenticated;

commit;
