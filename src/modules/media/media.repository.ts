import 'server-only';

import type { OwnedProject } from '@/modules/projects/project.repository';
import { createAdminSupabaseClient } from '@/server/supabase/admin';
import { createServerSupabaseClient } from '@/server/supabase/server';

import { INVITATION_IMAGE_MEDIA_KIND, type InvitationImageRole } from './invitation-image.types';
import {
  GALLERY_IMAGE_MEDIA_KIND,
  INVITATION_MEDIA_BUCKET,
  SUPPORTED_GALLERY_IMAGE_MIME_TYPES,
  type GalleryImageMimeType,
  type MediaAsset,
} from './media.types';

const mediaAssetSelect =
  'id, project_id, storage_bucket, storage_path, media_kind, mime_type, size_bytes, status, created_at, updated_at, deleted_at';

export class MediaRepositoryError extends Error {
  constructor() {
    super('The media repository could not complete the request.');
    this.name = 'MediaRepositoryError';
  }
}

export class MediaAssetUnavailableError extends Error {
  constructor() {
    super('The media asset is not available.');
    this.name = 'MediaAssetUnavailableError';
  }
}

function mapMediaAsset(record: unknown): MediaAsset {
  const asset = record as MediaAsset;

  if (
    !asset ||
    asset.storage_bucket !== INVITATION_MEDIA_BUCKET ||
    ![GALLERY_IMAGE_MEDIA_KIND, INVITATION_IMAGE_MEDIA_KIND].includes(asset.media_kind) ||
    !(SUPPORTED_GALLERY_IMAGE_MIME_TYPES as readonly string[]).includes(asset.mime_type)
  ) {
    throw new MediaRepositoryError();
  }

  return asset;
}

async function reserveProcessingImageMediaAsset(input: {
  assetId: string;
  mediaKind: MediaAsset['media_kind'];
  mimeType: GalleryImageMimeType;
  project: OwnedProject;
  sizeBytes: number;
  storagePath: string;
}): Promise<MediaAsset> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from('media_assets')
    .insert({
      id: input.assetId,
      media_kind: input.mediaKind,
      mime_type: input.mimeType,
      project_id: input.project.id,
      size_bytes: input.sizeBytes,
      status: 'processing',
      storage_bucket: INVITATION_MEDIA_BUCKET,
      storage_path: input.storagePath,
    })
    .select(mediaAssetSelect)
    .single();

  if (error || !data) {
    throw new MediaRepositoryError();
  }

  return mapMediaAsset(data);
}

export async function reserveProcessingGalleryMediaAsset(input: {
  assetId: string;
  mimeType: GalleryImageMimeType;
  project: OwnedProject;
  sizeBytes: number;
  storagePath: string;
}): Promise<MediaAsset> {
  return reserveProcessingImageMediaAsset({
    ...input,
    mediaKind: GALLERY_IMAGE_MEDIA_KIND,
  });
}

export async function reserveProcessingInvitationImageMediaAsset(input: {
  assetId: string;
  mimeType: GalleryImageMimeType;
  project: OwnedProject;
  sizeBytes: number;
  storagePath: string;
}): Promise<MediaAsset> {
  return reserveProcessingImageMediaAsset({
    ...input,
    mediaKind: INVITATION_IMAGE_MEDIA_KIND,
  });
}

export async function getMediaAssetForVerifiedProjectWithAdmin(
  project: OwnedProject,
  assetId: string,
): Promise<MediaAsset | null> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from('media_assets')
    .select(mediaAssetSelect)
    .eq('id', assetId)
    .eq('project_id', project.id)
    .maybeSingle();

  if (error) {
    throw new MediaRepositoryError();
  }

  return data ? mapMediaAsset(data) : null;
}

export async function markMediaAssetFailedForVerifiedProject(
  project: OwnedProject,
  assetId: string,
): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from('media_assets')
    .update({ status: 'failed' })
    .eq('id', assetId)
    .eq('project_id', project.id)
    .eq('status', 'processing')
    .is('deleted_at', null);

  if (error) {
    throw new MediaRepositoryError();
  }
}

export async function finalizeGalleryMediaAssetWithAdmin(input: {
  assetId: string;
  mimeType: GalleryImageMimeType;
  sizeBytes: number;
}): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.rpc('finalize_gallery_media_asset', {
    target_asset_id: input.assetId,
    validated_mime_type: input.mimeType,
    validated_size_bytes: input.sizeBytes,
  });

  if (error) {
    throw new MediaRepositoryError();
  }
}

export async function finalizeInvitationImageMediaAssetWithAdmin(input: {
  assetId: string;
  mimeType: GalleryImageMimeType;
  projectId: string;
  role: InvitationImageRole;
  sizeBytes: number;
}): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.rpc('finalize_invitation_image_media_asset', {
    target_asset_id: input.assetId,
    target_project_id: input.projectId,
    target_role: input.role,
    validated_mime_type: input.mimeType,
    validated_size_bytes: input.sizeBytes,
  });

  if (error) {
    throw new MediaRepositoryError();
  }
}

export async function removeInvitationImageMediaAssetWithAdmin(input: {
  assetId: string;
  projectId: string;
  role: InvitationImageRole;
}): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.rpc('remove_invitation_image_media_asset', {
    target_asset_id: input.assetId,
    target_project_id: input.projectId,
    target_role: input.role,
  });

  if (error) {
    throw new MediaRepositoryError();
  }
}

/** Owner-visible query under regular session RLS. */
export async function getReadyMediaAssetsForVerifiedProject(
  project: OwnedProject,
  mediaIds: string[],
): Promise<MediaAsset[]> {
  if (mediaIds.length === 0) {
    return [];
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('media_assets')
    .select(mediaAssetSelect)
    .eq('project_id', project.id)
    .eq('status', 'ready')
    .is('deleted_at', null)
    .in('id', mediaIds);

  if (error) {
    throw new MediaRepositoryError();
  }

  return (data ?? []).map(mapMediaAsset);
}

/** Owner-visible route lookup. RLS prevents guessed foreign asset IDs. */
export async function getOwnedReadyMediaAssetById(assetId: string): Promise<MediaAsset | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('media_assets')
    .select(mediaAssetSelect)
    .eq('id', assetId)
    .eq('status', 'ready')
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw new MediaRepositoryError();
  }

  return data ? mapMediaAsset(data) : null;
}

function isReferencedByCurrentSnapshot(input: {
  assetId: string;
  mediaKind: MediaAsset['media_kind'];
  snapshot: unknown;
}) {
  const payload = input.snapshot as
    | {
        draft?: {
          gallery?: { imageIds?: unknown };
          premiumMedia?: {
            coverImageId?: unknown;
            personOne?: { imageId?: unknown };
            personTwo?: { imageId?: unknown };
            storyImageId?: unknown;
          };
        };
      }
    | null;
  const draft = payload?.draft;

  if (!draft) {
    return false;
  }

  if (input.mediaKind === GALLERY_IMAGE_MEDIA_KIND) {
    return Array.isArray(draft.gallery?.imageIds) && draft.gallery.imageIds.includes(input.assetId);
  }

  if (input.mediaKind !== INVITATION_IMAGE_MEDIA_KIND) {
    return false;
  }

  return [
    draft.premiumMedia?.coverImageId,
    draft.premiumMedia?.personOne?.imageId,
    draft.premiumMedia?.personTwo?.imageId,
    draft.premiumMedia?.storyImageId,
  ].includes(input.assetId);
}

/** Public proxy lookup uses server-only privilege but verifies every public condition. */
export async function getCurrentPublicMediaAssetById(assetId: string): Promise<MediaAsset | null> {
  const supabase = createAdminSupabaseClient();
  const { data: assetRecord, error: assetError } = await supabase
    .from('media_assets')
    .select(mediaAssetSelect)
    .eq('id', assetId)
    .eq('status', 'ready')
    .is('deleted_at', null)
    .maybeSingle();

  if (assetError) {
    throw new MediaRepositoryError();
  }

  if (!assetRecord) {
    return null;
  }

  const asset = mapMediaAsset(assetRecord);
  const [{ data: snapshot, error: snapshotError }, { data: project, error: projectError }] =
    await Promise.all([
      supabase
        .from('published_invitation_snapshots')
        .select('snapshot')
        .eq('project_id', asset.project_id)
        .eq('is_current', true)
        .maybeSingle(),
      supabase
        .from('wedding_projects')
        .select('id')
        .eq('id', asset.project_id)
        .eq('status', 'published')
        .is('deleted_at', null)
        .maybeSingle(),
    ]);

  if (snapshotError || projectError) {
    throw new MediaRepositoryError();
  }

  if (!snapshot || !project) {
    return null;
  }

  return isReferencedByCurrentSnapshot({
    assetId,
    mediaKind: asset.media_kind,
    snapshot: snapshot.snapshot,
  })
    ? asset
    : null;
}

export async function downloadMediaAssetBytes(asset: MediaAsset): Promise<Blob> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.storage
    .from(asset.storage_bucket)
    .download(asset.storage_path);

  if (error || !data) {
    throw new MediaAssetUnavailableError();
  }

  return data;
}

export async function createSignedMediaUploadUrl(asset: MediaAsset): Promise<string> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.storage
    .from(asset.storage_bucket)
    .createSignedUploadUrl(asset.storage_path, { upsert: false });

  if (error || !data?.signedUrl) {
    throw new MediaRepositoryError();
  }

  return data.signedUrl;
}

export async function updateInvitationDraftGalleryForVerifiedProject(input: {
  content: unknown;
  project: OwnedProject;
}): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from('invitation_drafts')
    .update({ content: input.content })
    .eq('project_id', input.project.id)
    .is('deleted_at', null);

  if (error) {
    throw new MediaRepositoryError();
  }
}
