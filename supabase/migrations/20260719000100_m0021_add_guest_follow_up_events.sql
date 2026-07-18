-- Guest Follow-up & Reminder Center V1 / M0021
-- Owner-only append foundation for truthful manual follow-up activity. This table
-- stores no raw personal capability, personal URL, WhatsApp number snapshot, or
-- message body and never participates in public invitation snapshots.

begin;

create table public.guest_follow_up_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.wedding_projects (id) on delete cascade,
  guest_id uuid not null references public.guests (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  event_type text not null,
  message_kind text not null,
  channel text not null,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint guest_follow_up_events_event_type_check check (
    event_type in ('handoff_prepared', 'manual_contact_recorded')
  ),
  constraint guest_follow_up_events_message_kind_check check (
    message_kind in ('initial_invitation', 'rsvp_reminder', 'event_reminder', 'other')
  ),
  constraint guest_follow_up_events_channel_check check (
    channel in ('whatsapp', 'other')
  ),
  constraint guest_follow_up_events_metadata_object_check check (
    jsonb_typeof(metadata) = 'object'
  ),
  constraint guest_follow_up_events_metadata_size_check check (
    octet_length(metadata::text) <= 2048
  )
);

create index guest_follow_up_events_project_occurred_idx
on public.guest_follow_up_events (project_id, occurred_at desc, id desc);

create index guest_follow_up_events_guest_occurred_idx
on public.guest_follow_up_events (guest_id, occurred_at desc, id desc);

alter table public.guest_follow_up_events enable row level security;

-- Browser writes stay closed. Authenticated owners receive only project-scoped
-- reads; every append is performed by the narrow server RPC below.
revoke all on table public.guest_follow_up_events from anon, authenticated;
grant select on table public.guest_follow_up_events to authenticated;

create policy guest_follow_up_events_select_own_project
on public.guest_follow_up_events
for select
to authenticated
using (
  exists (
    select 1
    from public.guests as guest
    join public.wedding_projects as project
      on project.id = guest.project_id
    where guest.id = guest_follow_up_events.guest_id
      and guest.project_id = guest_follow_up_events.project_id
      and guest.deleted_at is null
      and project.account_id = (select auth.uid())
      and project.deleted_at is null
  )
);

-- Service-only append authority. Scope is repeated in the database so an admin
-- client bug cannot write a cross-project or inactive-guest event. Metadata is
-- allowlisted and string-bounded to keep capabilities and message bodies out.
create function public.append_guest_follow_up_event_for_server(
  target_project_id uuid,
  target_guest_id uuid,
  target_created_by uuid,
  requested_event_type text,
  requested_message_kind text,
  requested_channel text,
  requested_occurred_at timestamptz,
  requested_metadata jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  normalized_metadata jsonb := coalesce(requested_metadata, '{}'::jsonb);
  target_event_id uuid;
begin
  if requested_event_type not in ('handoff_prepared', 'manual_contact_recorded')
    or requested_message_kind not in ('initial_invitation', 'rsvp_reminder', 'event_reminder', 'other')
    or requested_channel not in ('whatsapp', 'other') then
    raise exception 'Invalid guest follow-up event contract.' using errcode = '22023';
  end if;

  if requested_occurred_at is null
    or requested_occurred_at > now() + interval '5 minutes' then
    raise exception 'Invalid guest follow-up occurrence time.' using errcode = '22023';
  end if;

  if jsonb_typeof(normalized_metadata) <> 'object'
    or normalized_metadata - array['source_surface', 'template_version', 'note_category'] <> '{}'::jsonb then
    raise exception 'Invalid guest follow-up metadata.' using errcode = '22023';
  end if;

  if normalized_metadata ? 'source_surface'
    and (
      jsonb_typeof(normalized_metadata -> 'source_surface') <> 'string'
      or char_length(normalized_metadata ->> 'source_surface') not between 1 and 80
    ) then
    raise exception 'Invalid guest follow-up source surface.' using errcode = '22023';
  end if;

  if normalized_metadata ? 'template_version'
    and (
      jsonb_typeof(normalized_metadata -> 'template_version') <> 'string'
      or char_length(normalized_metadata ->> 'template_version') not between 1 and 80
    ) then
    raise exception 'Invalid guest follow-up template version.' using errcode = '22023';
  end if;

  if normalized_metadata ? 'note_category'
    and (
      jsonb_typeof(normalized_metadata -> 'note_category') <> 'string'
      or char_length(normalized_metadata ->> 'note_category') not between 1 and 80
    ) then
    raise exception 'Invalid guest follow-up note category.' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.guests as guest
    join public.wedding_projects as project
      on project.id = guest.project_id
    where guest.id = target_guest_id
      and guest.project_id = target_project_id
      and guest.deleted_at is null
      and project.account_id = target_created_by
      and project.deleted_at is null
  ) then
    raise exception 'Guest follow-up target is unavailable.' using errcode = '42501';
  end if;

  insert into public.guest_follow_up_events (
    project_id,
    guest_id,
    created_by,
    event_type,
    message_kind,
    channel,
    occurred_at,
    metadata
  )
  values (
    target_project_id,
    target_guest_id,
    target_created_by,
    requested_event_type,
    requested_message_kind,
    requested_channel,
    requested_occurred_at,
    normalized_metadata
  )
  returning id into target_event_id;

  return target_event_id;
end;
$$;

revoke all on function public.append_guest_follow_up_event_for_server(uuid, uuid, uuid, text, text, text, timestamptz, jsonb) from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant select, insert on table public.guest_follow_up_events to service_role';
    execute 'grant execute on function public.append_guest_follow_up_event_for_server(uuid, uuid, uuid, text, text, text, timestamptz, jsonb) to service_role';
  end if;
end;
$$;

comment on table public.guest_follow_up_events is
  'Owner-only append log of prepared/manual follow-up activity; never proof of message delivery or reading.';

commit;
