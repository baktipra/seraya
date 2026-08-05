import 'server-only';

import { randomUUID } from 'node:crypto';

import { parseBuffer } from 'music-metadata';

import { requireCurrentUser } from '@/modules/auth/current-user';
import { getActiveInvitationDraftForVerifiedProject } from '@/modules/invitations/invitation-draft.repository';
import type { InvitationDraftContent } from '@/modules/invitations/invitation-draft.schema';
import type { OwnedProject } from '@/modules/projects/project.repository';
import { getOwnedProjectById } from '@/modules/projects/project.repository';

import { INVITATION_MEDIA_BUCKET } from './media.types';
import {
  createSignedInvitationAudioUploadUrl,
  downloadInvitationAudioBytes,
  finalizeInvitationAudioAssetWithAdmin,
  getInvitationAudioAssetForVerifiedProjectWithAdmin,
  getReadyInvitationAudioAssetForVerifiedProject,
  markInvitationAudioFailed,
  removeInvitationAudioAssetWithAdmin,
  reserveProcessingInvitationAudioAsset,
} from './invitation-audio.repository';
import {
  INVITATION_AUDIO_MEDIA_KIND,
  type InvitationAudioConfiguration,
  type InvitationAudioMimeType,
  type InvitationAudioSummary,
  type InvitationAudioUploadReservation,
} from './invitation-audio.types';
import {
  getInvitationAudioExtension,
  InvitationAudioValidationError,
  validateInvitationAudioBytes,
} from './invitation-audio.validation';

export class InvitationAudioUnavailableError extends Error {
  constructor() {
    super('The invitation audio is unavailable.');
    this.name = 'InvitationAudioUnavailableError';
  }
}

type InvitationAudioReservationInput = {
  mimeType: InvitationAudioMimeType;
  originalFileName: string;
  rightsAcknowledged: true;
  sizeBytes: number;
};

function requireActiveDraft<T>(draft: T | null): T {
  if (!draft) {
    throw new InvitationAudioUnavailableError();
  }

  return draft;
}

function buildOpaqueInvitationAudioStoragePath(input: {
  assetId: string;
  mimeType: InvitationAudioMimeType;
  projectId: string;
}) {
  return `projects/${input.projectId}/audio/${input.assetId}.${getInvitationAudioExtension(
    input.mimeType,
  )}`;
}

function toInvitationAudioSummary(input: {
  durationSeconds: number;
  id: string;
  mimeType: InvitationAudioMimeType;
  originalFileName: string;
  sizeBytes: number;
}): InvitationAudioSummary {
  return input;
}

export async function reserveInvitationAudioUploadForCurrentUser(input: {
  projectId: string;
  upload: InvitationAudioReservationInput;
}): Promise<InvitationAudioUploadReservation> {
  const user = await requireCurrentUser();
  const project = await getOwnedProjectById(input.projectId, user.id);
  requireActiveDraft(await getActiveInvitationDraftForVerifiedProject(project));

  if (!input.upload.rightsAcknowledged) {
    throw new InvitationAudioValidationError(
      'Konfirmasikan bahwa Anda berhak menggunakan audio ini.',
    );
  }

  const assetId = randomUUID();
  const storagePath = buildOpaqueInvitationAudioStoragePath({
    assetId,
    mimeType: input.upload.mimeType,
    projectId: project.id,
  });
  const asset = await reserveProcessingInvitationAudioAsset({
    assetId,
    mimeType: input.upload.mimeType,
    originalFileName: input.upload.originalFileName,
    project,
    sizeBytes: input.upload.sizeBytes,
    storagePath,
  });

  try {
    const signedUploadUrl = await createSignedInvitationAudioUploadUrl(asset);
    return { assetId: asset.id, signedUploadUrl };
  } catch (error) {
    await markInvitationAudioFailed(project, asset.id).catch(() => undefined);
    throw error;
  }
}

export async function finalizeInvitationAudioUploadForCurrentUser(input: {
  assetId: string;
  projectId: string;
}): Promise<InvitationAudioSummary> {
  const user = await requireCurrentUser();
  const project = await getOwnedProjectById(input.projectId, user.id);
  requireActiveDraft(await getActiveInvitationDraftForVerifiedProject(project));
  const asset = await getInvitationAudioAssetForVerifiedProjectWithAdmin(project, input.assetId);

  if (
    !asset ||
    asset.status !== 'processing' ||
    asset.deleted_at !== null ||
    asset.media_kind !== INVITATION_AUDIO_MEDIA_KIND ||
    asset.storage_bucket !== INVITATION_MEDIA_BUCKET ||
    !asset.original_file_name ||
    !asset.rights_acknowledged_at
  ) {
    throw new InvitationAudioUnavailableError();
  }

  try {
    const blob = await downloadInvitationAudioBytes(asset);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const metadata = await parseBuffer(
      bytes,
      { mimeType: asset.mime_type, size: bytes.byteLength },
      { duration: true, skipCovers: true },
    );
    const validated = validateInvitationAudioBytes({
      bytes,
      declaredMimeType: asset.mime_type,
      declaredSizeBytes: asset.size_bytes,
      durationSeconds: metadata.format.duration,
    });

    await finalizeInvitationAudioAssetWithAdmin({
      assetId: asset.id,
      durationSeconds: validated.durationSeconds,
      mimeType: validated.mimeType,
      projectId: project.id,
      sizeBytes: bytes.byteLength,
    });

    return toInvitationAudioSummary({
      durationSeconds: validated.durationSeconds,
      id: asset.id,
      mimeType: validated.mimeType,
      originalFileName: asset.original_file_name,
      sizeBytes: bytes.byteLength,
    });
  } catch (error) {
    await markInvitationAudioFailed(project, asset.id).catch(() => undefined);

    if (error instanceof InvitationAudioValidationError) {
      throw error;
    }

    throw new InvitationAudioUnavailableError();
  }
}

export async function removeInvitationAudioForCurrentUser(input: {
  assetId: string;
  projectId: string;
}): Promise<void> {
  const user = await requireCurrentUser();
  const project = await getOwnedProjectById(input.projectId, user.id);
  const draft = requireActiveDraft(await getActiveInvitationDraftForVerifiedProject(project));

  if (draft.content.audio.assetId !== input.assetId) {
    throw new InvitationAudioUnavailableError();
  }

  await removeInvitationAudioAssetWithAdmin({
    assetId: input.assetId,
    projectId: project.id,
  });
}

export async function getInvitationAudioSummaryForVerifiedProject(input: {
  configuration: InvitationAudioConfiguration;
  project: OwnedProject;
}): Promise<InvitationAudioSummary | null> {
  if (!input.configuration.assetId) {
    return null;
  }

  const asset = await getReadyInvitationAudioAssetForVerifiedProject(
    input.project,
    input.configuration.assetId,
  );

  if (
    !asset ||
    !asset.duration_seconds ||
    !asset.original_file_name ||
    !asset.rights_acknowledged_at ||
    asset.duration_seconds !== input.configuration.durationSeconds ||
    input.configuration.originalFileName !== asset.original_file_name ||
    input.configuration.rightsAcknowledged !== true
  ) {
    return null;
  }

  return toInvitationAudioSummary({
    durationSeconds: asset.duration_seconds,
    id: asset.id,
    mimeType: asset.mime_type,
    originalFileName: asset.original_file_name,
    sizeBytes: asset.size_bytes,
  });
}

export async function assertInvitationAudioReadyForVerifiedProject(input: {
  content: Pick<InvitationDraftContent, 'audio'>;
  project: OwnedProject;
}): Promise<void> {
  if (!input.content.audio.assetId) {
    return;
  }

  const summary = await getInvitationAudioSummaryForVerifiedProject({
    configuration: input.content.audio,
    project: input.project,
  });

  if (!summary) {
    throw new InvitationAudioUnavailableError();
  }
}
