-- SRY-006 / M0005
-- One private, versioned invitation draft document per active wedding project.
-- The project INSERT trigger makes project + default draft creation one PostgreSQL transaction.

begin;

create table public.invitation_drafts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.wedding_projects (id) on delete cascade,
  schema_version integer not null default 1,
  content jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint invitation_drafts_schema_version_valid check (schema_version >= 1),
  constraint invitation_drafts_content_object check (jsonb_typeof(content) = 'object')
);

create unique index invitation_drafts_one_active_per_project_idx
on public.invitation_drafts (project_id)
where deleted_at is null;

create index invitation_drafts_project_id_active_idx
on public.invitation_drafts (project_id)
where deleted_at is null;

create trigger invitation_drafts_set_updated_at
before update on public.invitation_drafts
for each row
execute function public.set_updated_at();

create function public.create_default_invitation_draft()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  insert into public.invitation_drafts (project_id, schema_version, content)
  values (
    new.id,
    1,
    jsonb_build_object(
      'meta', jsonb_build_object(
        'locale', 'id-ID',
        'timezone', new.default_timezone
      ),
      'hero', jsonb_build_object(
        'eyebrow', 'The Wedding Of',
        'title', concat(new.person_one_name, ' & ', new.person_two_name),
        'subtitle', null
      ),
      'couple', jsonb_build_object(
        'personOne', jsonb_build_object(
          'displayName', new.person_one_name,
          'fullName', null,
          'parentLine', null
        ),
        'personTwo', jsonb_build_object(
          'displayName', new.person_two_name,
          'fullName', null,
          'parentLine', null
        )
      ),
      'story', jsonb_build_object(
        'enabled', false,
        'heading', null,
        'body', null
      ),
      'events', jsonb_build_object(
        'enabled', true,
        'primaryDate', new.event_date_primary,
        'ceremony', jsonb_build_object(
          'enabled', false,
          'title', null,
          'date', null,
          'startTime', null,
          'endTime', null
        ),
        'reception', jsonb_build_object(
          'enabled', false,
          'title', null,
          'date', null,
          'startTime', null,
          'endTime', null
        )
      ),
      'location', jsonb_build_object(
        'enabled', false,
        'venueName', null,
        'address', null,
        'mapsUrl', null
      ),
      'gallery', jsonb_build_object(
        'enabled', false,
        'imageIds', jsonb_build_array()
      ),
      'rsvp', jsonb_build_object(
        'enabled', true,
        'heading', null,
        'lead', null
      ),
      'closing', jsonb_build_object(
        'enabled', false,
        'message', null,
        'signature', null
      )
    )
  );

  return new;
end;
$$;

revoke all on function public.create_default_invitation_draft() from public, anon, authenticated;

create trigger wedding_projects_create_default_invitation_draft
after insert on public.wedding_projects
for each row
execute function public.create_default_invitation_draft();

alter table public.invitation_drafts enable row level security;

revoke all on table public.invitation_drafts from anon, authenticated;
grant select on table public.invitation_drafts to authenticated;
grant insert (project_id, schema_version, content) on table public.invitation_drafts to authenticated;
grant update (schema_version, content, deleted_at) on table public.invitation_drafts to authenticated;

-- Keep the ownership predicate separate from soft-delete visibility. PostgreSQL
-- RLS applies SELECT policy visibility to UPDATE as well; filtering deleted rows
-- here would prevent an owner from setting deleted_at. Repository helpers apply
-- deleted_at IS NULL for every normal read.
create policy invitation_drafts_select_own_project
on public.invitation_drafts
for select
to authenticated
using (
  exists (
    select 1
    from public.wedding_projects as project
    where project.id = invitation_drafts.project_id
      and project.account_id = (select auth.uid())
      and project.deleted_at is null
  )
);

create policy invitation_drafts_insert_own_active_project
on public.invitation_drafts
for insert
to authenticated
with check (
  deleted_at is null
  and exists (
    select 1
    from public.wedding_projects as project
    where project.id = invitation_drafts.project_id
      and project.account_id = (select auth.uid())
      and project.deleted_at is null
  )
);

create policy invitation_drafts_update_own_active
on public.invitation_drafts
for update
to authenticated
using (
  deleted_at is null
  and exists (
    select 1
    from public.wedding_projects as project
    where project.id = invitation_drafts.project_id
      and project.account_id = (select auth.uid())
      and project.deleted_at is null
  )
)
with check (
  exists (
    select 1
    from public.wedding_projects as project
    where project.id = invitation_drafts.project_id
      and project.account_id = (select auth.uid())
      and project.deleted_at is null
  )
);

commit;
