-- SERAYA V4J / M0023
-- Dedicated private invitation-audio media foundation. Extends the existing
-- M0008 reserve -> signed upload -> server validation -> atomic finalize model.

begin;

alter table public.media_assets
  add column duration_seconds integer,
  add column original_file_name text,
  add column rights_acknowledged_at timestamptz;

alter table public.media_assets
  drop constraint media_assets_media_kind_valid,
  drop constraint media_assets_mime_type_valid,
  drop constraint media_assets_size_bytes_valid;

alter table public.media_assets
  add constraint media_assets_media_kind_valid check (
    media_kind in ('gallery_image', 'invitation_audio')
  ),
  add constraint media_assets_mime_type_valid check (
    (media_kind = 'gallery_image' and mime_type in ('image/jpeg', 'image/png', 'image/webp'))
    or
    (media_kind = 'invitation_audio' and mime_type in ('audio/mpeg', 'audio/mp4', 'audio/x-m4a'))
  ),
  add constraint media_assets_size_bytes_valid check (
    size_bytes > 0
    and (
      (media_kind = 'gallery_image' and size_bytes <= 10485760)
      or
      (media_kind = 'invitation_audio' and size_bytes <= 15728640)
    )
  ),
  add constraint media_assets_audio_metadata_valid check (
    duration_seconds is null or duration_seconds between 1 and 600
  ),
  add constraint media_assets_audio_rights_valid check (
    media_kind <> 'invitation_audio'
    or (
      original_file_name is not null
      and length(original_file_name) between 1 and 180
      and rights_acknowledged_at is not null
    )
  ),
  add constraint media_assets_ready_audio_duration_valid check (
    media_kind <> 'invitation_audio'
    or status <> 'ready'::public.media_status
    or duration_seconds is not null
  );

update storage.buckets
set
  file_size_limit = 15728640,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'audio/mpeg',
    'audio/mp4',
    'audio/x-m4a'
  ]::text[]
where id = 'invitation-media';

create or replace function public.enforce_media_asset_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'processing'::public.media_status then
      raise exception using errcode = '22023', message = 'Media assets must begin in processing state.';
    end if;
    return new;
  end if;

  if new.project_id is distinct from old.project_id
    or new.storage_bucket is distinct from old.storage_bucket
    or new.storage_path is distinct from old.storage_path
    or new.media_kind is distinct from old.media_kind
    or new.original_file_name is distinct from old.original_file_name
    or new.rights_acknowledged_at is distinct from old.rights_acknowledged_at
  then
    raise exception using errcode = '55000', message = 'Media asset identity is immutable.';
  end if;

  if old.status = 'processing'::public.media_status then
    if new.status not in (
      'processing'::public.media_status,
      'ready'::public.media_status,
      'failed'::public.media_status
    ) then
      raise exception using errcode = '22023', message = 'Invalid media asset lifecycle transition.';
    end if;
    return new;
  end if;

  if old.status = 'ready'::public.media_status then
    if new.mime_type is distinct from old.mime_type
      or new.size_bytes is distinct from old.size_bytes
      or new.duration_seconds is distinct from old.duration_seconds
    then
      raise exception using errcode = '55000', message = 'Ready media asset metadata is immutable.';
    end if;

    if new.status not in ('ready'::public.media_status, 'deleted'::public.media_status) then
      raise exception using errcode = '22023', message = 'Invalid media asset lifecycle transition.';
    end if;

    if new.status = 'deleted'::public.media_status and new.deleted_at is null then
      raise exception using errcode = '22023', message = 'Deleted media assets require a deleted timestamp.';
    end if;
    return new;
  end if;

  if new.status is distinct from old.status
    or new.mime_type is distinct from old.mime_type
    or new.size_bytes is distinct from old.size_bytes
    or new.duration_seconds is distinct from old.duration_seconds
  then
    raise exception using errcode = '55000', message = 'Failed and deleted media assets are immutable.';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_media_asset_lifecycle() from public, anon, authenticated;

create function public.finalize_invitation_audio_media_asset(
  target_project_id uuid,
  target_asset_id uuid,
  validated_mime_type text,
  validated_size_bytes bigint,
  validated_duration_seconds integer
)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  target_asset public.media_assets%rowtype;
  active_draft public.invitation_drafts%rowtype;
  previous_asset_id uuid;
  previous_asset_id_text text;
  updated_content jsonb;
begin
  if validated_mime_type not in ('audio/mpeg', 'audio/mp4', 'audio/x-m4a') then
    raise exception using errcode = '22023', message = 'Unsupported invitation audio MIME type.';
  end if;
  if validated_size_bytes <= 0 or validated_size_bytes > 15728640 then
    raise exception using errcode = '22023', message = 'Invalid invitation audio file size.';
  end if;
  if validated_duration_seconds <= 0 or validated_duration_seconds > 600 then
    raise exception using errcode = '22023', message = 'Invalid invitation audio duration.';
  end if;

  select * into target_asset
  from public.media_assets as asset
  where asset.id = target_asset_id
    and asset.project_id = target_project_id
    and asset.media_kind = 'invitation_audio'
    and asset.deleted_at is null
  for update;

  if not found
    or target_asset.status <> 'processing'::public.media_status
    or target_asset.rights_acknowledged_at is null
    or target_asset.original_file_name is null
  then
    raise exception using errcode = '22023', message = 'Invitation audio is not available for finalization.';
  end if;

  select * into active_draft
  from public.invitation_drafts as draft
  where draft.project_id = target_project_id and draft.deleted_at is null
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'An active invitation draft is required for audio.';
  end if;

  previous_asset_id_text := active_draft.content #>> '{audio,assetId}';
  if previous_asset_id_text is not null and previous_asset_id_text <> '' then
    begin
      previous_asset_id := previous_asset_id_text::uuid;
    exception when invalid_text_representation then
      previous_asset_id := null;
    end;
  end if;

  update public.media_assets as asset
  set
    duration_seconds = validated_duration_seconds,
    mime_type = validated_mime_type,
    size_bytes = validated_size_bytes,
    status = 'ready'::public.media_status
  where asset.id = target_asset.id;

  updated_content := jsonb_set(
    active_draft.content,
    '{audio}',
    jsonb_build_object(
      'assetId', target_asset.id::text,
      'durationSeconds', validated_duration_seconds,
      'originalFileName', target_asset.original_file_name,
      'rightsAcknowledged', true
    ),
    true
  );

  update public.invitation_drafts as draft
  set content = updated_content
  where draft.id = active_draft.id;

  if previous_asset_id is not null and previous_asset_id <> target_asset.id then
    update public.media_assets as old_asset
    set status = 'deleted'::public.media_status, deleted_at = now()
    where old_asset.id = previous_asset_id
      and old_asset.project_id = target_project_id
      and old_asset.media_kind = 'invitation_audio'
      and old_asset.status = 'ready'::public.media_status
      and old_asset.deleted_at is null;
  end if;
end;
$$;

revoke all on function public.finalize_invitation_audio_media_asset(uuid, uuid, text, bigint, integer)
from public, anon, authenticated;

create function public.remove_invitation_audio_media_asset(
  target_project_id uuid,
  target_asset_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  target_asset public.media_assets%rowtype;
  active_draft public.invitation_drafts%rowtype;
  current_asset_id text;
begin
  select * into target_asset
  from public.media_assets as asset
  where asset.id = target_asset_id
    and asset.project_id = target_project_id
    and asset.media_kind = 'invitation_audio'
    and asset.status = 'ready'::public.media_status
    and asset.deleted_at is null
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'Invitation audio is unavailable.';
  end if;

  select * into active_draft
  from public.invitation_drafts as draft
  where draft.project_id = target_project_id and draft.deleted_at is null
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'An active invitation draft is required for audio.';
  end if;

  current_asset_id := active_draft.content #>> '{audio,assetId}';
  if current_asset_id is distinct from target_asset.id::text then
    raise exception using errcode = '22023', message = 'Invitation audio is not attached to this draft.';
  end if;

  update public.invitation_drafts as draft
  set content = jsonb_set(
    active_draft.content,
    '{audio}',
    jsonb_build_object(
      'assetId', null,
      'durationSeconds', null,
      'originalFileName', null,
      'rightsAcknowledged', false
    ),
    true
  )
  where draft.id = active_draft.id;

  update public.media_assets as asset
  set status = 'deleted'::public.media_status, deleted_at = now()
  where asset.id = target_asset.id;
end;
$$;

revoke all on function public.remove_invitation_audio_media_asset(uuid, uuid)
from public, anon, authenticated;

create or replace function public.validate_invitation_draft_gallery_media(
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
  audio_content jsonb;
  audio_asset_id_text text;
  audio_duration integer;
begin
  gallery_image_ids := draft_content #> '{gallery,imageIds}';

  if gallery_image_ids is not null then
    if jsonb_typeof(gallery_image_ids) <> 'array' then
      raise exception using errcode = '22023', message = 'Invitation gallery must contain an image ID array.';
    end if;

    for raw_asset_id in
      select value from jsonb_array_elements(gallery_image_ids) as image_id(value)
    loop
      if jsonb_typeof(raw_asset_id) <> 'string' then
        raise exception using errcode = '22023', message = 'Invitation gallery contains an invalid media ID.';
      end if;

      asset_id_text := raw_asset_id #>> '{}';
      begin
        parsed_asset_id := asset_id_text::uuid;
      exception when invalid_text_representation then
        raise exception using errcode = '22023', message = 'Invitation gallery contains an invalid media ID.';
      end;

      select * into matching_asset from public.media_assets as asset where asset.id = parsed_asset_id;
      if not found
        or matching_asset.project_id <> target_project_id
        or matching_asset.media_kind <> 'gallery_image'
        or matching_asset.status <> 'ready'::public.media_status
        or matching_asset.deleted_at is not null
      then
        raise exception using errcode = '22023', message = 'Invitation gallery contains an unavailable media asset.';
      end if;
    end loop;
  end if;

  audio_content := draft_content -> 'audio';
  if audio_content is null then
    return;
  end if;
  if jsonb_typeof(audio_content) <> 'object' then
    raise exception using errcode = '22023', message = 'Invitation audio configuration is invalid.';
  end if;

  audio_asset_id_text := audio_content ->> 'assetId';
  if audio_asset_id_text is null then
    return;
  end if;
  if coalesce((audio_content ->> 'rightsAcknowledged')::boolean, false) is not true then
    raise exception using errcode = '22023', message = 'Invitation audio requires rights acknowledgement.';
  end if;

  begin
    parsed_asset_id := audio_asset_id_text::uuid;
    audio_duration := (audio_content ->> 'durationSeconds')::integer;
  exception when invalid_text_representation then
    raise exception using errcode = '22023', message = 'Invitation audio configuration is invalid.';
  end;

  select * into matching_asset from public.media_assets as asset where asset.id = parsed_asset_id;
  if not found
    or matching_asset.project_id <> target_project_id
    or matching_asset.media_kind <> 'invitation_audio'
    or matching_asset.status <> 'ready'::public.media_status
    or matching_asset.deleted_at is not null
    or matching_asset.rights_acknowledged_at is null
    or matching_asset.duration_seconds is distinct from audio_duration
  then
    raise exception using errcode = '22023', message = 'Invitation audio contains an unavailable media asset.';
  end if;
end;
$$;

revoke all on function public.validate_invitation_draft_gallery_media(uuid, jsonb)
from public, anon, authenticated;

commit;
