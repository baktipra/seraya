begin;

alter table public.media_assets drop constraint if exists media_assets_media_kind_valid;
alter table public.media_assets add constraint media_assets_media_kind_valid
check (media_kind in ('gallery_image', 'invitation_audio', 'invitation_image'));

alter table public.media_assets drop constraint if exists media_assets_mime_type_valid;
alter table public.media_assets add constraint media_assets_mime_type_valid check (
  (media_kind in ('gallery_image', 'invitation_image') and mime_type in ('image/jpeg', 'image/png', 'image/webp'))
  or (media_kind = 'invitation_audio' and mime_type in ('audio/mpeg', 'audio/mp4', 'audio/x-m4a'))
);

alter table public.media_assets drop constraint if exists media_assets_size_bytes_valid;
alter table public.media_assets add constraint media_assets_size_bytes_valid check (
  size_bytes > 0 and (
    (media_kind in ('gallery_image', 'invitation_image') and size_bytes <= 10485760)
    or (media_kind = 'invitation_audio' and size_bytes <= 15728640)
  )
);

create or replace function public.finalize_invitation_image_media_asset(
  target_project_id uuid,
  target_asset_id uuid,
  target_role text,
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
  premium_media jsonb;
  previous_asset_id uuid;
  previous_asset_id_text text;
begin
  if target_role not in ('cover', 'person_one', 'person_two', 'story') then
    raise exception using errcode = '22023', message = 'Unsupported invitation image role.';
  end if;

  if validated_mime_type not in ('image/jpeg', 'image/png', 'image/webp') then
    raise exception using errcode = '22023', message = 'Unsupported invitation image MIME type.';
  end if;

  if validated_size_bytes <= 0 or validated_size_bytes > 10485760 then
    raise exception using errcode = '22023', message = 'Invalid invitation image file size.';
  end if;

  select * into target_asset
  from public.media_assets as asset
  where asset.id = target_asset_id
    and asset.project_id = target_project_id
    and asset.media_kind = 'invitation_image'
    and asset.deleted_at is null
  for update;

  if not found or target_asset.status <> 'processing'::public.media_status then
    raise exception using errcode = '22023', message = 'Invitation image is not available for finalization.';
  end if;

  select * into active_draft
  from public.invitation_drafts as draft
  where draft.project_id = target_project_id
    and draft.deleted_at is null
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'An active invitation draft is required for premium media.';
  end if;

  premium_media := active_draft.content -> 'premiumMedia';
  if premium_media is null then
    premium_media := jsonb_build_object(
      'coverImageId', null,
      'personOne', jsonb_build_object(
        'imageId', null,
        'socialLinks', jsonb_build_object('instagram', null, 'tiktok', null, 'website', null)
      ),
      'personTwo', jsonb_build_object(
        'imageId', null,
        'socialLinks', jsonb_build_object('instagram', null, 'tiktok', null, 'website', null)
      ),
      'storyImageId', null,
      'weddingFilm', jsonb_build_object(
        'caption', null,
        'enabled', false,
        'heading', null,
        'url', null
      )
    );
  elsif jsonb_typeof(premium_media) <> 'object' then
    raise exception using errcode = '22023', message = 'Premium media configuration must be an object.';
  end if;

  if target_role = 'cover' then
    previous_asset_id_text := premium_media ->> 'coverImageId';
    premium_media := jsonb_set(premium_media, '{coverImageId}', to_jsonb(target_asset.id::text), true);
  elsif target_role = 'person_one' then
    if jsonb_typeof(premium_media -> 'personOne') <> 'object' then
      premium_media := jsonb_set(
        premium_media,
        '{personOne}',
        jsonb_build_object(
          'imageId', null,
          'socialLinks', jsonb_build_object('instagram', null, 'tiktok', null, 'website', null)
        ),
        true
      );
    end if;
    previous_asset_id_text := premium_media #>> '{personOne,imageId}';
    premium_media := jsonb_set(premium_media, '{personOne,imageId}', to_jsonb(target_asset.id::text), true);
  elsif target_role = 'person_two' then
    if jsonb_typeof(premium_media -> 'personTwo') <> 'object' then
      premium_media := jsonb_set(
        premium_media,
        '{personTwo}',
        jsonb_build_object(
          'imageId', null,
          'socialLinks', jsonb_build_object('instagram', null, 'tiktok', null, 'website', null)
        ),
        true
      );
    end if;
    previous_asset_id_text := premium_media #>> '{personTwo,imageId}';
    premium_media := jsonb_set(premium_media, '{personTwo,imageId}', to_jsonb(target_asset.id::text), true);
  else
    previous_asset_id_text := premium_media ->> 'storyImageId';
    premium_media := jsonb_set(premium_media, '{storyImageId}', to_jsonb(target_asset.id::text), true);
  end if;

  if previous_asset_id_text is not null and previous_asset_id_text <> '' then
    begin
      previous_asset_id := previous_asset_id_text::uuid;
    exception when invalid_text_representation then
      previous_asset_id := null;
    end;
  end if;

  update public.media_assets as asset
  set
    mime_type = validated_mime_type,
    size_bytes = validated_size_bytes,
    status = 'ready'::public.media_status
  where asset.id = target_asset.id;

  update public.invitation_drafts as draft
  set content = jsonb_set(active_draft.content, '{premiumMedia}', premium_media, true)
  where draft.id = active_draft.id;

  if previous_asset_id is not null and previous_asset_id <> target_asset.id then
    update public.media_assets as old_asset
    set status = 'deleted'::public.media_status, deleted_at = now()
    where old_asset.id = previous_asset_id
      and old_asset.project_id = target_project_id
      and old_asset.media_kind = 'invitation_image'
      and old_asset.status = 'ready'::public.media_status
      and old_asset.deleted_at is null;
  end if;
end;
$$;

revoke all on function public.finalize_invitation_image_media_asset(uuid, uuid, text, text, bigint)
from public, anon, authenticated;

create or replace function public.remove_invitation_image_media_asset(
  target_project_id uuid,
  target_asset_id uuid,
  target_role text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  target_asset public.media_assets%rowtype;
  active_draft public.invitation_drafts%rowtype;
  premium_media jsonb;
  current_asset_id text;
begin
  if target_role not in ('cover', 'person_one', 'person_two', 'story') then
    raise exception using errcode = '22023', message = 'Unsupported invitation image role.';
  end if;

  select * into target_asset
  from public.media_assets as asset
  where asset.id = target_asset_id
    and asset.project_id = target_project_id
    and asset.media_kind = 'invitation_image'
    and asset.status = 'ready'::public.media_status
    and asset.deleted_at is null
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'Invitation image is unavailable.';
  end if;

  select * into active_draft
  from public.invitation_drafts as draft
  where draft.project_id = target_project_id
    and draft.deleted_at is null
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'An active invitation draft is required for premium media.';
  end if;

  premium_media := active_draft.content -> 'premiumMedia';
  if premium_media is null or jsonb_typeof(premium_media) <> 'object' then
    raise exception using errcode = '22023', message = 'Premium media configuration is unavailable.';
  end if;

  if target_role = 'cover' then
    current_asset_id := premium_media ->> 'coverImageId';
    premium_media := jsonb_set(premium_media, '{coverImageId}', 'null'::jsonb, true);
  elsif target_role = 'person_one' then
    current_asset_id := premium_media #>> '{personOne,imageId}';
    premium_media := jsonb_set(premium_media, '{personOne,imageId}', 'null'::jsonb, true);
  elsif target_role = 'person_two' then
    current_asset_id := premium_media #>> '{personTwo,imageId}';
    premium_media := jsonb_set(premium_media, '{personTwo,imageId}', 'null'::jsonb, true);
  else
    current_asset_id := premium_media ->> 'storyImageId';
    premium_media := jsonb_set(premium_media, '{storyImageId}', 'null'::jsonb, true);
  end if;

  if current_asset_id is distinct from target_asset.id::text then
    raise exception using errcode = '22023', message = 'Invitation image is not attached to this role.';
  end if;

  update public.invitation_drafts as draft
  set content = jsonb_set(active_draft.content, '{premiumMedia}', premium_media, true)
  where draft.id = active_draft.id;

  update public.media_assets as asset
  set status = 'deleted'::public.media_status, deleted_at = now()
  where asset.id = target_asset.id;
end;
$$;

revoke all on function public.remove_invitation_image_media_asset(uuid, uuid, text)
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
begin
  gallery_image_ids := draft_content #> '{gallery,imageIds}';
  if gallery_image_ids is null then return; end if;
  if jsonb_typeof(gallery_image_ids) <> 'array' then
    raise exception using errcode = '22023', message = 'Invitation gallery must contain an image ID array.';
  end if;

  for raw_asset_id in select value from jsonb_array_elements(gallery_image_ids) as image_id(value)
  loop
    if jsonb_typeof(raw_asset_id) <> 'string' then
      raise exception using errcode = '22023', message = 'Invitation gallery contains an invalid media ID.';
    end if;
    asset_id_text := raw_asset_id #>> '{}';
    begin parsed_asset_id := asset_id_text::uuid;
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
end;
$$;

revoke all on function public.validate_invitation_draft_gallery_media(uuid, jsonb)
from public, anon, authenticated;

create or replace function public.validate_invitation_draft_premium_media(
  target_project_id uuid,
  draft_content jsonb
)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  media_id_text text;
  parsed_asset_id uuid;
  matching_asset public.media_assets%rowtype;
  media_ids text[];
begin
  if draft_content -> 'premiumMedia' is null then return; end if;
  if jsonb_typeof(draft_content -> 'premiumMedia') <> 'object' then
    raise exception using errcode = '22023', message = 'Premium media configuration must be an object.';
  end if;

  media_ids := array[
    draft_content #>> '{premiumMedia,coverImageId}',
    draft_content #>> '{premiumMedia,personOne,imageId}',
    draft_content #>> '{premiumMedia,personTwo,imageId}',
    draft_content #>> '{premiumMedia,storyImageId}'
  ];

  foreach media_id_text in array media_ids
  loop
    if media_id_text is null or media_id_text = '' then continue; end if;
    begin parsed_asset_id := media_id_text::uuid;
    exception when invalid_text_representation then
      raise exception using errcode = '22023', message = 'Premium media contains an invalid media ID.';
    end;

    select * into matching_asset from public.media_assets as asset where asset.id = parsed_asset_id;
    if not found
      or matching_asset.project_id <> target_project_id
      or matching_asset.media_kind <> 'invitation_image'
      or matching_asset.status <> 'ready'::public.media_status
      or matching_asset.deleted_at is not null
    then
      raise exception using errcode = '22023', message = 'Premium media contains an unavailable media asset.';
    end if;
  end loop;
end;
$$;

revoke all on function public.validate_invitation_draft_premium_media(uuid, jsonb)
from public, anon, authenticated;

create or replace function public.validate_published_invitation_premium_media()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if jsonb_typeof(new.snapshot) <> 'object' or jsonb_typeof(new.snapshot -> 'draft') <> 'object' then
    raise exception using errcode = '22023', message = 'Published invitation snapshot is invalid.';
  end if;

  perform public.validate_invitation_draft_premium_media(new.project_id, new.snapshot -> 'draft');
  return new;
end;
$$;

revoke all on function public.validate_published_invitation_premium_media()
from public, anon, authenticated;

drop trigger if exists published_invitation_snapshots_validate_premium_media
on public.published_invitation_snapshots;

create trigger published_invitation_snapshots_validate_premium_media
before insert on public.published_invitation_snapshots
for each row
execute function public.validate_published_invitation_premium_media();

commit;
