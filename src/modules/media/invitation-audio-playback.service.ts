import 'server-only';

import { requireCurrentUser } from '@/modules/auth/current-user';
import { getActiveInvitationDraftForVerifiedProject } from '@/modules/invitations/invitation-draft.repository';
import { getOwnedProjectById } from '@/modules/projects/project.repository';
import { getPublicInvitationBySlug } from '@/modules/publications/public-invitation.service';

import {
  createSignedInvitationAudioPlaybackUrl,
  getReadyInvitationAudioAssetForProjectIdWithAdmin,
} from './invitation-audio.repository';
import type {
  InvitationAudioConfiguration,
  InvitationAudioMediaAsset,
} from './invitation-audio.types';

export const INVITATION_AUDIO_PLAYBACK_TTL_SECONDS = 300 as const;

export class InvitationAudioPlaybackUnavailableError extends Error {
  constructor() {
    super('Invitation audio playback is unavailable.');
    this.name = 'InvitationAudioPlaybackUnavailableError';
  }
}

function assetMatchesConfiguration(
  asset: InvitationAudioMediaAsset | null,
  configuration: InvitationAudioConfiguration,
): asset is InvitationAudioMediaAsset {
  return Boolean(
    asset &&
    asset.status === 'ready' &&
    asset.deleted_at === null &&
    asset.rights_acknowledged_at &&
    asset.duration_seconds &&
    asset.original_file_name &&
    configuration.assetId === asset.id &&
    configuration.durationSeconds === asset.duration_seconds &&
    configuration.originalFileName === asset.original_file_name &&
    configuration.rightsAcknowledged === true,
  );
}

async function createPlaybackUrlForProjectConfiguration(input: {
  configuration: InvitationAudioConfiguration;
  projectId: string;
}): Promise<string | null> {
  if (!input.configuration.assetId) {
    return null;
  }

  const asset = await getReadyInvitationAudioAssetForProjectIdWithAdmin(
    input.projectId,
    input.configuration.assetId,
  );

  if (!assetMatchesConfiguration(asset, input.configuration)) {
    return null;
  }

  return createSignedInvitationAudioPlaybackUrl(asset, INVITATION_AUDIO_PLAYBACK_TTL_SECONDS);
}

/** Owner-only playback for local and persisted draft preview surfaces. */
export async function getInvitationAudioPlaybackUrlForCurrentUser(
  projectId: string,
): Promise<string | null> {
  const user = await requireCurrentUser();
  const project = await getOwnedProjectById(projectId, user.id);
  const draft = await getActiveInvitationDraftForVerifiedProject(project);

  if (!draft) {
    return null;
  }

  return createPlaybackUrlForProjectConfiguration({
    configuration: draft.content.audio,
    projectId: project.id,
  });
}

/**
 * Anonymous playback resolves only the current published snapshot by safe slug.
 * Personal invitations intentionally reuse this public-content capability: no
 * guest token, guest identity, RSVP state, or private delivery data is needed.
 */
export async function getPublishedInvitationAudioPlaybackUrl(slug: string): Promise<string | null> {
  const publishedInvitation = await getPublicInvitationBySlug(slug);
  const snapshot = publishedInvitation?.snapshot ?? null;

  if (!publishedInvitation || !publishedInvitation.is_current || !snapshot) {
    return null;
  }

  return createPlaybackUrlForProjectConfiguration({
    configuration: snapshot.draft.audio,
    projectId: publishedInvitation.project_id,
  });
}
