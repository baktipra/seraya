import 'server-only';

import type { OwnedProject } from '@/modules/projects/project.repository';
import { createAdminSupabaseClient } from '@/server/supabase/admin';
import { createServerSupabaseClient } from '@/server/supabase/server';

import {
  GALLERY_IMAGE_MEDIA_KIND,
  INVITATION_MEDIA_BUCKET,
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
    asset.media_kind !== GALLERY_IMAGE_MEDIA_KIND
  ) {
    throw new MediaRepositoryError();
  }

  return asset;
}

export async function reserveProcessingGalleryMediaAsset(input: {
  assetId: string;
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
      media_kind: GALLERY_IMAGE_MEDIA_KIND,
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

/** Public proxy lookup uses server-only privilege but verifies every public condition. */
export async function getCurrentPublicMediaAssetById(assetId: string): Promise<MediaAsset | null> {
  const supabase = createAdminSupabaseClient();
  const { data: snapshots, error: snapshotError } = await supabase
    .from('published_invitation_snapshots')
    .select('project_id, snapshot')
    .eq('is_current', true)
    .contains('snapshot', { draft: { gallery: { imageIds: [assetId] } } })
    .limit(1);

  if (snapshotError) {
    throw new MediaRepositoryError();
  }

  const snapshot = snapshots?.[0] as { project_id?: string } | undefined;

  if (!snapshot?.project_id) {
    return null;
  }

  const { data: project, error: projectError } = await supabase
    .from('wedding_projects')
    .select('id')
    .eq('id', snapshot.project_id)
    .eq('status', 'published')
    .is('deleted_at', null)
    .maybeSingle();

  if (projectError) {
    throw new MediaRepositoryError();
  }

  if (!project) {
    return null;
  }

  const { data: asset, error: assetError } = await supabase
    .from('media_assets')
    .select(mediaAssetSelect)
    .eq('id', assetId)
    .eq('project_id', snapshot.project_id)
    .eq('status', 'ready')
    .is('deleted_at', null)
    .maybeSingle();

  if (assetError) {
    throw new MediaRepositoryError();
  }

  return asset ? mapMediaAsset(asset) : null;
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
