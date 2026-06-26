-- SRY-028 / M0017
-- Current RSVP attendance count is private live guest data. It is deliberately
-- separate from party_size, which remains the maximum invited party capacity.

begin;

alter table public.guests
  add column rsvp_attendee_count smallint;

-- Existing attending records predate this feature and therefore may safely
-- remain unknown (NULL). Pending and declined guests can never retain a
-- confirmed attendee count, and any supplied count may never exceed the
-- server-owned invited party limit.
alter table public.guests
  add constraint guests_rsvp_attendee_count_contract check (
    (
      rsvp_status = 'attending'::public.rsvp_status
      and (
        rsvp_attendee_count is null
        or rsvp_attendee_count between 1 and party_size
      )
    )
    or (
      rsvp_status in ('pending'::public.rsvp_status, 'declined'::public.rsvp_status)
      and rsvp_attendee_count is null
    )
  );

-- The personal resolver has a deliberately narrow capability payload. Extend
-- it only with the recipient's own party limit and RSVP count; it still never
-- returns IDs, token hashes, contacts, or other guests' data.
drop function public.resolve_personal_guest_invitation(text, text);

create function public.resolve_personal_guest_invitation(
  requested_slug text,
  raw_token text
)
returns table (
  guest_display_name text,
  party_size smallint,
  rsvp_status public.rsvp_status,
  rsvp_attendee_count smallint,
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
    guest.party_size,
    guest.rsvp_status,
    guest.rsvp_attendee_count,
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

-- Replace the old RSVP capability endpoint so new attendance submissions are
-- validated against the resolved guest row, never browser-provided party data.
drop function public.submit_personal_guest_rsvp(text, text, public.rsvp_status);

create function public.submit_personal_guest_rsvp(
  requested_slug text,
  raw_token text,
  requested_status public.rsvp_status,
  requested_attendee_count smallint
)
returns public.rsvp_status
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  requested_token_hash text;
  target_guest_id uuid;
  target_party_size smallint;
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

  select guest.id, guest.party_size
  into target_guest_id, target_party_size
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

  if requested_status = 'attending'::public.rsvp_status
    and (
      requested_attendee_count is null
      or requested_attendee_count < 1
      or requested_attendee_count > target_party_size
    ) then
    return null;
  end if;

  update public.guests
  set
    rsvp_status = requested_status,
    rsvp_attendee_count = case
      when requested_status = 'attending'::public.rsvp_status then requested_attendee_count
      else null
    end
  where id = target_guest_id
    and deleted_at is null
  returning rsvp_status into updated_status;

  return updated_status;
end;
$$;

revoke all on function public.resolve_personal_guest_invitation(text, text) from public;
revoke all on function public.submit_personal_guest_rsvp(text, text, public.rsvp_status, smallint) from public;
grant execute on function public.resolve_personal_guest_invitation(text, text) to anon, authenticated;
grant execute on function public.submit_personal_guest_rsvp(text, text, public.rsvp_status, smallint) to anon, authenticated;

commit;
