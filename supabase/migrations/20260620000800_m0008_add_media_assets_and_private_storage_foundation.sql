-- SRY-009 / M0008
-- Private gallery media foundation. Storage remains private; application routes
-- proxy validated binary bytes for owner previews and published public output.

begin;

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.wedding_projects (id) on delete cascade,
  storage_bucket text not null default 'invitation-media',
  storage_path text not null unique,
  media_kind text not null,
  mime_type text not null,
  size_bytes bigint not null,
  status public.media_status not null default 'processing',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint media_assets_storage_bucket_valid check (storage_bucket = 'invitation-media'),
  constraint media_assets_media_kind_valid check (media_kind = 'gallery_image'),
  constraint media_assets_mime_type_valid check (
    mime_type in ('image/jpeg', 'image/png', 'image/webp')
  ),
  constraint media_assets_size_bytes_valid check (
    size_bytes > 0 and size_bytes <= 10485760
  )
);

create index media_assets_project_id_active_idx
on public.media_assets (project_id)
where deleted_at is null;

create trigger media_assets_set_updated_at
before update on public.media_assets
for each row
execute function public.set_updated_at();

-- Storage is intentionally private. No storage.objects policies are created in
-- this migration: signed upload credentials are issued server-side and every
-- read is proxied by an application route after its own authorization check.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'invitation-media',
  'invitation-media',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Keep media lifecycle narrow. A ready asset's storage identity and validated
-- metadata cannot be changed; removal from a live gallery only removes its ID
-- from invitation_drafts and never mutates the asset itself in this ticket.
create function public.enforce_media_asset_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'processing'::public.media_status then
      raise exception using
        errcode = '22023',
        message = 'Media assets must begin in processing state.';
    end if;

    return new;
  end if;

  if old.status = 'processing'::public.media_status then
    if new.status not in (
      'processing'::public.media_status,
      'ready'::public.media_status,
      'failed'::public.media_status
    ) then
      raise exception using
        errcode = '22023',
        message = 'Invalid media asset lifecycle transition.';
    end if;

    return new;
  end if;

  if old.status = 'ready'::public.media_status then
    if new.project_id is distinct from old.project_id
      or new.storage_bucket is distinct from old.storage_bucket
      or new.storage_path is distinct from old.storage_path
      or new.mime_type is distinct from old.mime_type
      or new.size_bytes is distinct from old.size_bytes
    then
      raise exception using
        errcode = '55000',
        message = 'Ready media asset identity is immutable.';
    end if;

    if new.status not in ('ready'::public.media_status, 'deleted'::public.media_status) then
      raise exception using
        errcode = '22023',
        message = 'Invalid media asset lifecycle transition.';
    end if;

    if new.status = 'deleted'::public.media_status and new.deleted_at is null then
      raise exception using
        errcode = '22023',
        message = 'Deleted media assets require a deleted timestamp.';
    end if;

    return new;
  end if;

  if new.status is distinct from old.status
    or new.project_id is distinct from old.project_id
    or new.storage_bucket is distinct from old.storage_bucket
    or new.storage_path is distinct from old.storage_path
    or new.mime_type is distinct from old.mime_type
    or new.size_bytes is distinct from old.size_bytes
  then
    raise exception using
      errcode = '55000',
      message = 'Failed and deleted media assets are immutable.';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_media_asset_lifecycle() from public, anon, authenticated;

create trigger media_assets_enforce_lifecycle
before insert or update on public.media_assets
for each row
execute function public.enforce_media_asset_lifecycle();

alter table public.media_assets enable row level security;

revoke all on table public.media_assets from anon, authenticated;
grant select on table public.media_assets to authenticated;

create policy media_assets_select_own_project
on public.media_assets
for select
to authenticated
using (
  exists (
    select 1
    from public.wedding_projects as project
    where project.id = media_assets.project_id
      and project.account_id = (select auth.uid())
      and project.deleted_at is null
  )
);

-- Server-only transaction after the upload bytes have been independently
-- validated. It moves processing -> ready and appends a single gallery ID to
-- the active draft in one transaction. It is intentionally not executable by
-- browser roles.
create function public.finalize_gallery_media_asset(
  target_asset_id uuid,
  validated_mime_type text,
  validated_size_bytes bigint
)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  target_asset public.media_assets%rowtype;
  active_draft public.invitation_drafts%rowtype;
  image_ids jsonb;
  updated_content jsonb;
begin
  if validated_mime_type not in ('image/jpeg', 'image/png', 'image/webp') then
    raise exception using
      errcode = '22023',
      message = 'Unsupported media MIME type.';
  end if;

  if validated_size_bytes <= 0 or validated_size_bytes > 10485760 then
    raise exception using
      errcode = '22023',
      message = 'Invalid media file size.';
  end if;

  select *
  into target_asset
  from public.media_assets as asset
  where asset.id = target_asset_id
    and asset.deleted_at is null
  for update;

  if not found or target_asset.status <> 'processing'::public.media_status then
    raise exception using
      errcode = '22023',
      message = 'Media asset is not available for finalization.';
  end if;

  select *
  into active_draft
  from public.invitation_drafts as draft
  where draft.project_id = target_asset.project_id
    and draft.deleted_at is null
  for update;

  if not found then
    raise exception using
      errcode = '22023',
      message = 'An active invitation draft is required for gallery media.';
  end if;

  image_ids := active_draft.content #> '{gallery,imageIds}';

  if image_ids is null or jsonb_typeof(image_ids) <> 'array' then
    raise exception using
      errcode = '22023',
      message = 'Invitation gallery must contain an image ID array.';
  end if;

  if jsonb_array_length(image_ids) >= 12 then
    raise exception using
      errcode = '22023',
      message = 'Invitation gallery cannot contain more than 12 images.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements_text(image_ids) as image_id(value)
    where image_id.value = target_asset.id::text
  ) then
    raise exception using
      errcode = '22023',
      message = 'Media asset is already attached to the invitation gallery.';
  end if;

  updated_content := jsonb_set(
    jsonb_set(
      active_draft.content,
      '{gallery,imageIds}',
      image_ids || jsonb_build_array(target_asset.id::text),
      true
    ),
    '{gallery,enabled}',
    'true'::jsonb,
    true
  );

  update public.media_assets as asset
  set
    mime_type = validated_mime_type,
    size_bytes = validated_size_bytes,
    status = 'ready'::public.media_status
  where asset.id = target_asset.id;

  update public.invitation_drafts as draft
  set content = updated_content
  where draft.id = active_draft.id;
end;
$$;

revoke all on function public.finalize_gallery_media_asset(uuid, text, bigint)
from public, anon, authenticated;

-- Owners may update their own draft through the existing RLS boundary, so the
-- narrow product gallery limit also lives at the database boundary. This is not
-- a duplicate of the full Zod contract; it protects only the M0008 12-image
-- invariant for every write path.
create function public.enforce_invitation_draft_gallery_limit()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  gallery_image_ids jsonb;
begin
  gallery_image_ids := new.content #> '{gallery,imageIds}';

  if gallery_image_ids is not null
    and jsonb_typeof(gallery_image_ids) = 'array'
    and jsonb_array_length(gallery_image_ids) > 12
  then
    raise exception using
      errcode = '22023',
      message = 'Invitation gallery cannot contain more than 12 images.';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_invitation_draft_gallery_limit()
from public, anon, authenticated;

create trigger invitation_drafts_enforce_gallery_limit
before insert or update of content on public.invitation_drafts
for each row
execute function public.enforce_invitation_draft_gallery_limit();

-- Publish-time gallery validation keeps a snapshot from referring to missing,
-- foreign, failed, deleted, or non-ready media. It does not reimplement the
-- complete Zod document contract; it verifies only media references.
create function public.validate_invitation_draft_gallery_media(
  target_project_id uuid,
  draft_content jsonb
)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  gallery_image_ids jsonb;
  raw_asset_id jsonb;
  asset_id_text text;
  parsed_asset_id uuid;
  matching_asset public.media_assets%rowtype;
begin
  gallery_image_ids := draft_content #> '{gallery,imageIds}';

  if gallery_image_ids is null then
    return;
  end if;

  if jsonb_typeof(gallery_image_ids) <> 'array' then
    raise exception using
      errcode = '22023',
      message = 'Invitation gallery must contain an image ID array.';
  end if;

  for raw_asset_id in
    select value
    from jsonb_array_elements(gallery_image_ids) as image_id(value)
  loop
    if jsonb_typeof(raw_asset_id) <> 'string' then
      raise exception using
        errcode = '22023',
        message = 'Invitation gallery contains an invalid media ID.';
    end if;

    asset_id_text := raw_asset_id #>> '{}';

    begin
      parsed_asset_id := asset_id_text::uuid;
    exception
      when invalid_text_representation then
        raise exception using
          errcode = '22023',
          message = 'Invitation gallery contains an invalid media ID.';
    end;

    select *
    into matching_asset
    from public.media_assets as asset
    where asset.id = parsed_asset_id;

    if not found
      or matching_asset.project_id <> target_project_id
      or matching_asset.status <> 'ready'::public.media_status
      or matching_asset.deleted_at is not null
    then
      raise exception using
        errcode = '22023',
        message = 'Invitation gallery contains an unavailable media asset.';
    end if;
  end loop;
end;
$$;

revoke all on function public.validate_invitation_draft_gallery_media(uuid, jsonb)
from public, anon, authenticated;

-- M0007's publication boundary is deliberately replaced rather than edited.
-- All original ownership, snapshot, immutability, and raw-HTML behavior remains
-- intact, with gallery media availability added before a snapshot is copied.
create or replace function public.publish_invitation_snapshot(target_project_id uuid)
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

  perform public.validate_invitation_draft_gallery_media(target_project.id, active_draft.content);

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
