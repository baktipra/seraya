-- SRY-008 / M0007
-- Immutable, public-safe invitation snapshots. The public runtime reads this table only;
-- it never reads the live invitation_drafts table.

begin;

-- Supabase installs supported extensions in the extensions schema. The production
-- migration uses CITEXT for case-insensitive current-slug uniqueness.
create extension if not exists citext with schema extensions;

create table public.published_invitation_snapshots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.wedding_projects (id) on delete cascade,
  slug extensions.citext not null,
  revision integer not null,
  template_id text not null,
  draft_schema_version integer not null,
  snapshot jsonb not null,
  is_current boolean not null default true,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint published_invitation_snapshots_revision_valid check (revision >= 1),
  constraint published_invitation_snapshots_template_valid check (template_id = 'roselle'),
  constraint published_invitation_snapshots_draft_schema_version_valid check (draft_schema_version >= 1),
  constraint published_invitation_snapshots_snapshot_object check (jsonb_typeof(snapshot) = 'object')
);

create unique index published_invitation_snapshots_project_revision_unique_idx
on public.published_invitation_snapshots (project_id, revision);

create unique index published_invitation_snapshots_one_current_project_idx
on public.published_invitation_snapshots (project_id)
where is_current;

create unique index published_invitation_snapshots_one_current_slug_idx
on public.published_invitation_snapshots (slug)
where is_current;

create index published_invitation_snapshots_public_lookup_idx
on public.published_invitation_snapshots (slug)
where is_current;

-- Snapshot values are public-rendering data. Reuse the M0006 recursive guard so
-- no SQL/RPC path can persist literal raw HTML in nested snapshot values.
create function public.enforce_published_invitation_snapshot_safety()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if public.invitation_draft_content_contains_raw_html(new.snapshot) then
    raise exception using
      errcode = '22023',
      message = 'Published invitation snapshot cannot contain raw HTML.';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_published_invitation_snapshot_safety() from public, anon, authenticated;

create trigger published_invitation_snapshots_enforce_content_safety
before insert or update of snapshot on public.published_invitation_snapshots
for each row
execute function public.enforce_published_invitation_snapshot_safety();

-- Immutable snapshots can only be superseded internally by changing the previous
-- current row from true to false. No content or identity field may be changed.
create function public.enforce_published_invitation_snapshot_immutability()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if old.is_current = true
    and new.is_current = false
    and new.project_id is not distinct from old.project_id
    and new.slug is not distinct from old.slug
    and new.revision is not distinct from old.revision
    and new.template_id is not distinct from old.template_id
    and new.draft_schema_version is not distinct from old.draft_schema_version
    and new.snapshot is not distinct from old.snapshot
    and new.published_at is not distinct from old.published_at
    and new.created_at is not distinct from old.created_at
  then
    return new;
  end if;

  raise exception using
    errcode = '55000',
    message = 'Published invitation snapshots are immutable.';
end;
$$;

revoke all on function public.enforce_published_invitation_snapshot_immutability() from public, anon, authenticated;

create trigger published_invitation_snapshots_enforce_immutability
before update on public.published_invitation_snapshots
for each row
execute function public.enforce_published_invitation_snapshot_immutability();

-- These small security-definer predicates keep the public snapshot RLS policy
-- independent from direct anonymous table access to wedding_projects.
create function public.can_read_current_published_invitation_snapshot(
  snapshot_project_id uuid,
  snapshot_is_current boolean
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select
    snapshot_is_current
    and exists (
      select 1
      from public.wedding_projects as project
      where project.id = snapshot_project_id
        and project.status = 'published'::public.project_status
        and project.deleted_at is null
    );
$$;

create function public.owns_published_invitation_snapshot(snapshot_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.wedding_projects as project
    where project.id = snapshot_project_id
      and project.account_id = (select auth.uid())
      and project.deleted_at is null
  );
$$;

-- The predicates only answer access checks and are used by the RLS policies
-- below. They intentionally expose no project, draft, or snapshot values.
grant execute on function public.can_read_current_published_invitation_snapshot(uuid, boolean)
to anon, authenticated;
grant execute on function public.owns_published_invitation_snapshot(uuid)
to authenticated;

alter table public.published_invitation_snapshots enable row level security;

revoke all on table public.published_invitation_snapshots from anon, authenticated;
grant select on table public.published_invitation_snapshots to anon, authenticated;

create policy published_invitation_snapshots_select_current_public
on public.published_invitation_snapshots
for select
to anon, authenticated
using (
  (select public.can_read_current_published_invitation_snapshot(project_id, is_current))
);

create policy published_invitation_snapshots_select_own_project
on public.published_invitation_snapshots
for select
to authenticated
using ((select public.owns_published_invitation_snapshot(project_id)));

-- Atomic owner-only publish boundary. All publication fields are derived inside
-- PostgreSQL from the owned active project and active draft. Client payloads
-- never choose snapshot JSON, slug, revision, project owner, template, or status.
create function public.publish_invitation_snapshot(target_project_id uuid)
returns table (
  id uuid,
  project_id uuid,
  slug extensions.citext,
  revision integer,
  template_id text,
  draft_schema_version integer,
  snapshot jsonb,
  is_current boolean,
  published_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  target_project public.wedding_projects%rowtype;
  active_draft public.invitation_drafts%rowtype;
  snapshot_payload jsonb;
  next_revision integer;
  inserted_snapshot public.published_invitation_snapshots%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception using
      errcode = '42501',
      message = 'Authentication is required to publish an invitation.';
  end if;

  select *
  into target_project
  from public.wedding_projects as project
  where project.id = target_project_id
    and project.deleted_at is null
  for update;

  if not found or target_project.account_id <> (select auth.uid()) then
    raise exception using
      errcode = '42501',
      message = 'Project is not available for publication.';
  end if;

  if target_project.event_date_primary is null then
    raise exception using
      errcode = '22023',
      message = 'Project event date is required before publication.';
  end if;

  select *
  into active_draft
  from public.invitation_drafts as draft
  where draft.project_id = target_project.id
    and draft.deleted_at is null;

  if not found then
    raise exception using
      errcode = '22023',
      message = 'An active invitation draft is required before publication.';
  end if;

  if jsonb_typeof(active_draft.content) <> 'object' then
    raise exception using
      errcode = '22023',
      message = 'Invitation draft content must be an object.';
  end if;

  if public.invitation_draft_content_contains_raw_html(active_draft.content) then
    raise exception using
      errcode = '22023',
      message = 'Invitation draft content cannot contain raw HTML.';
  end if;

  snapshot_payload := jsonb_build_object(
    'project', jsonb_build_object(
      'slug', target_project.slug,
      'eventDatePrimary', target_project.event_date_primary::text,
      'eventCity', target_project.event_city,
      'timezone', target_project.default_timezone
    ),
    'draft', active_draft.content
  );

  if public.invitation_draft_content_contains_raw_html(snapshot_payload) then
    raise exception using
      errcode = '22023',
      message = 'Published invitation snapshot cannot contain raw HTML.';
  end if;

  select coalesce(max(existing_snapshot.revision), 0) + 1
  into next_revision
  from public.published_invitation_snapshots as existing_snapshot
  where existing_snapshot.project_id = target_project.id;

  update public.published_invitation_snapshots as existing_current
  set is_current = false
  where existing_current.project_id = target_project.id
    and existing_current.is_current = true;

  insert into public.published_invitation_snapshots (
    project_id,
    slug,
    revision,
    template_id,
    draft_schema_version,
    snapshot,
    is_current
  )
  values (
    target_project.id,
    target_project.slug,
    next_revision,
    'roselle',
    active_draft.schema_version,
    snapshot_payload,
    true
  )
  returning * into inserted_snapshot;

  update public.wedding_projects as published_project
  set status = 'published'::public.project_status
  where published_project.id = target_project.id;

  return query
  select
    inserted_snapshot.id,
    inserted_snapshot.project_id,
    inserted_snapshot.slug,
    inserted_snapshot.revision,
    inserted_snapshot.template_id,
    inserted_snapshot.draft_schema_version,
    inserted_snapshot.snapshot,
    inserted_snapshot.is_current,
    inserted_snapshot.published_at,
    inserted_snapshot.created_at;
end;
$$;

revoke all on function public.publish_invitation_snapshot(uuid) from public, anon;
grant execute on function public.publish_invitation_snapshot(uuid) to authenticated;

commit;
