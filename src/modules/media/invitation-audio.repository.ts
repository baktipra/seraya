import 'server-only';

import type { OwnedProject } from '@/modules/projects/project.repository';
import { createAdminSupabaseClient } from '@/server/supabase/admin';
import { createServerSupabaseClient } from '@/server/supabase/server';

import { INVITATION_MEDIA_BUCKET } from './media.types';
import {
  INVITATION_AUDIO_MEDIA_KIND,
  type InvitationAudioMediaAsset,
  type InvitationAudioMimeType,
} from './invitation-audio.types';

const invitationAudioSelect =
  'id, project_id, storage_bucket, storage_path, media_kind, mime_type, size_bytes, status, duration_seconds, original_file_name, rights_acknowledged_at, created_at, updated_at, deleted_at';

export class InvitationAudioRepositoryError extends Error {
  constructor() {
    super('The invitation audio repository could not complete the request.');
    this.name = 'InvitationAudioRepositoryError';
  }
}

function mapInvitationAudioAsset(record: unknown): InvitationAudioMediaAsset {
  const asset = record as InvitationAudioMediaAsset;

  if (
    !asset ||
    asset.storage_bucket !== INVITATION_MEDIA_BUCKET ||
    asset.media_kind !== INVITATION_AUDIO_MEDIA_KIND ||
    !['audio/mpeg', 'audio/mp4', 'audio/x-m4a'].includes(asset.mime_type)
  ) {
    throw new InvitationAudioRepositoryError();
  }

  return asset;
}

export async function reserveProcessingInvitationAudioAsset(input: {
  assetId: string;
  mimeType: InvitationAudioMimeType;
  originalFileName: string;
  project: OwnedProject;
  sizeBytes: number;
  storagePath: string;
}): Promise<InvitationAudioMediaAsset> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from('media_assets')
    .insert({
      id: input.assetId,
      media_kind: INVITATION_AUDIO_MEDIA_KIND,
      mime_type: input.mimeType,
      original_file_name: input.originalFileName,
      project_id: input.project.id,
      rights_acknowledged_at: new Date().toISOString(),
      size_bytes: input.sizeBytes,
      status: 'processing',
      storage_bucket: INVITATION_MEDIA_BUCKET,
      storage_path: input.storagePath,
    })
    .select(invitationAudioSelect)
    .single();

  if (error || !data) {
    throw new InvitationAudioRepositoryError();
  }

  return mapInvitationAudioAsset(data);
}

export async function getInvitationAudioAssetForVerifiedProjectWithAdmin(
  project: OwnedProject,
  assetId: string,
): Promise<InvitationAudioMediaAsset | null> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from('media_assets')
    .select(invitationAudioSelect)
    .eq('id', assetId)
    .eq('project_id', project.id)
    .eq('media_kind', INVITATION_AUDIO_MEDIA_KIND)
    .maybeSingle();

  if (error) {
    throw new InvitationAudioRepositoryError();
  }

  return data ? mapInvitationAudioAsset(data) : null;
}

export async function getReadyInvitationAudioAssetForVerifiedProject(
  project: OwnedProject,
  assetId: string,
): Promise<InvitationAudioMediaAsset | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('media_assets')
    .select(invitationAudioSelect)
    .eq('id', assetId)
    .eq('project_id', project.id)
    .eq('media_kind', INVITATION_AUDIO_MEDIA_KIND)
    .eq('status', 'ready')
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw new InvitationAudioRepositoryError();
  }

  return data ? mapInvitationAudioAsset(data) : null;
}

export async function createSignedInvitationAudioUploadUrl(
  asset: InvitationAudioMediaAsset,
): Promise<string> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.storage
    .from(asset.storage_bucket)
    .createSignedUploadUrl(asset.storage_path, { upsert: false });

  if (error || !data?.signedUrl) {
    throw new InvitationAudioRepositoryError();
  }

  return data.signedUrl;
}

export async function downloadInvitationAudioBytes(
  asset: InvitationAudioMediaAsset,
): Promise<Blob> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.storage
    .from(asset.storage_bucket)
    .download(asset.storage_path);

  if (error || !data) {
    throw new InvitationAudioRepositoryError();
  }

  return data;
}

export async function markInvitationAudioFailed(
  project: OwnedProject,
  assetId: string,
): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from('media_assets')
    .update({ status: 'failed' })
    .eq('id', assetId)
    .eq('project_id', project.id)
    .eq('media_kind', INVITATION_AUDIO_MEDIA_KIND)
    .eq('status', 'processing')
    .is('deleted_at', null);

  if (error) {
    throw new InvitationAudioRepositoryError();
  }
}

export async function finalizeInvitationAudioAssetWithAdmin(input: {
  assetId: string;
  durationSeconds: number;
  mimeType: InvitationAudioMimeType;
  projectId: string;
  sizeBytes: number;
}): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.rpc('finalize_invitation_audio_media_asset', {
    target_asset_id: input.assetId,
    target_project_id: input.projectId,
    validated_duration_seconds: input.durationSeconds,
    validated_mime_type: input.mimeType,
    validated_size_bytes: input.sizeBytes,
  });

  if (error) {
    throw new InvitationAudioRepositoryError();
  }
}

export async function removeInvitationAudioAssetWithAdmin(input: {
  assetId: string;
  projectId: string;
}): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.rpc('remove_invitation_audio_media_asset', {
    target_asset_id: input.assetId,
    target_project_id: input.projectId,
  });

  if (error) {
    throw new InvitationAudioRepositoryError();
  }
}
