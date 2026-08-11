begin;

create or replace function public.is_premium_media_asset_referenced_by_current_snapshot(
  target_project_id uuid,
  target_asset_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.published_invitation_snapshots as snapshot
    where snapshot.project_id = target_project_id
      and snapshot.is_current = true
      and (
        snapshot.snapshot #>> '{draft,premiumMedia,coverImageId}' = target_asset_id::text
        or snapshot.snapshot #>> '{draft,premiumMedia,personOne,imageId}' = target_asset_id::text
        or snapshot.snapshot #>> '{draft,premiumMedia,personTwo,imageId}' = target_asset_id::text
        or snapshot.snapshot #>> '{draft,premiumMedia,storyImageId}' = target_asset_id::text
      )
  );
$$;

revoke all on function public.is_premium_media_asset_referenced_by_current_snapshot(uuid, uuid)
from public, anon, authenticated;

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

  if previous_asset_id is not null
    and previous_asset_id <> target_asset.id
    and not public.is_premium_media_asset_referenced_by_current_snapshot(
      target_project_id,
      previous_asset_id
    )
  then
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

  if not public.is_premium_media_asset_referenced_by_current_snapshot(
    target_project_id,
    target_asset.id
  ) then
    update public.media_assets as asset
    set status = 'deleted'::public.media_status, deleted_at = now()
    where asset.id = target_asset.id;
  end if;
end;
$$;

revoke all on function public.remove_invitation_image_media_asset(uuid, uuid, text)
from public, anon, authenticated;

commit;
