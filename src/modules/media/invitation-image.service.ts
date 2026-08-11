import 'server-only';

import { randomUUID } from 'node:crypto';

import { requireCurrentUser } from '@/modules/auth/current-user';
import {
  getActiveInvitationDraftForVerifiedProject,
  updateActiveInvitationDraftForVerifiedProject,
} from '@/modules/invitations/invitation-draft.repository';
import { invitationDraftContentSchema } from '@/modules/invitations/invitation-draft.schema';
import { getOwnedProjectById, type OwnedProject } from '@/modules/projects/project.repository';

import {
  createSignedMediaUploadUrl,
  downloadMediaAssetBytes,
  finalizeInvitationImageMediaAssetWithAdmin,
  getMediaAssetForVerifiedProjectWithAdmin,
  markMediaAssetFailedForVerifiedProject,
  removeInvitationImageMediaAssetWithAdmin,
  reserveProcessingInvitationImageMediaAsset,
} from './media.repository';
import { INVITATION_MEDIA_BUCKET, type GalleryImageMimeType } from './media.types';
import {
  INVITATION_IMAGE_MEDIA_KIND,
  type InvitationImageRole,
  type InvitationImageUploadReservation,
  type InvitationPremiumMediaImage,
} from './invitation-image.types';
import {
  getGalleryImageExtension,
  GalleryMediaValidationError,
  validateGalleryImageBytes,
} from './media.validation';

export class InvitationImageUnavailableError extends Error {
  constructor() {
    super('The invitation image is unavailable.');
    this.name = 'InvitationImageUnavailableError';
  }
}

export class PremiumGuestMediaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PremiumGuestMediaValidationError';
  }
}

function requireActiveDraft<T>(draft: T | null): T {
  if (!draft) {
    throw new InvitationImageUnavailableError();
  }

  return draft;
}

function getRoleLabel(role: InvitationImageRole) {
  switch (role) {
    case 'cover':
      return 'Foto cover undangan';
    case 'person_one':
      return 'Potret mempelai pertama';
    case 'person_two':
      return 'Potret mempelai kedua';
    case 'story':
      return 'Foto cerita pasangan';
  }
}

function getConfiguredAssetId(projectDraft: Awaited<ReturnType<typeof getActiveInvitationDraftForVerifiedProject>>, role: InvitationImageRole) {
  if (!projectDraft) return null;
  const premiumMedia = projectDraft.content.premiumMedia;

  switch (role) {
    case 'cover':
      return premiumMedia.coverImageId;
    case 'person_one':
      return premiumMedia.personOne.imageId;
    case 'person_two':
      return premiumMedia.personTwo.imageId;
    case 'story':
      return premiumMedia.storyImageId;
  }
}

function buildOpaqueInvitationImageStoragePath(input: {
  assetId: string;
  mimeType: GalleryImageMimeType;
  projectId: string;
  role: InvitationImageRole;
}) {
  return `projects/${input.projectId}/featured/${input.role}/${input.assetId}.${getGalleryImageExtension(
    input.mimeType,
  )}`;
}

export async function reserveInvitationImageUploadForCurrentUser(input: {
  projectId: string;
  role: InvitationImageRole;
  upload: { mimeType: GalleryImageMimeType; sizeBytes: number };
}): Promise<InvitationImageUploadReservation> {
  const user = await requireCurrentUser();
  const project = await getOwnedProjectById(input.projectId, user.id);
  requireActiveDraft(await getActiveInvitationDraftForVerifiedProject(project));

  const assetId = randomUUID();
  const storagePath = buildOpaqueInvitationImageStoragePath({
    assetId,
    mimeType: input.upload.mimeType,
    projectId: project.id,
    role: input.role,
  });
  const asset = await reserveProcessingInvitationImageMediaAsset({
    assetId,
    mimeType: input.upload.mimeType,
    project,
    sizeBytes: input.upload.sizeBytes,
    storagePath,
  });

  try {
    const signedUploadUrl = await createSignedMediaUploadUrl(asset);
    return { assetId: asset.id, signedUploadUrl };
  } catch (error) {
    await markMediaAssetFailedForVerifiedProject(project, asset.id).catch(() => undefined);
    throw error;
  }
}

export async function finalizeInvitationImageUploadForCurrentUser(input: {
  assetId: string;
  projectId: string;
  role: InvitationImageRole;
}): Promise<InvitationPremiumMediaImage> {
  const user = await requireCurrentUser();
  const project = await getOwnedProjectById(input.projectId, user.id);
  requireActiveDraft(await getActiveInvitationDraftForVerifiedProject(project));
  const asset = await getMediaAssetForVerifiedProjectWithAdmin(project, input.assetId);

  if (
    !asset ||
    asset.status !== 'processing' ||
    asset.deleted_at !== null ||
    asset.media_kind !== INVITATION_IMAGE_MEDIA_KIND ||
    asset.storage_bucket !== INVITATION_MEDIA_BUCKET
  ) {
    throw new InvitationImageUnavailableError();
  }

  try {
    const blob = await downloadMediaAssetBytes(asset);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const mimeType = validateGalleryImageBytes({
      bytes,
      declaredMimeType: asset.mime_type,
      declaredSizeBytes: asset.size_bytes,
    });

    await finalizeInvitationImageMediaAssetWithAdmin({
      assetId: asset.id,
      mimeType,
      projectId: project.id,
      role: input.role,
      sizeBytes: bytes.byteLength,
    });

    return {
      alt: getRoleLabel(input.role),
      id: asset.id,
      src: `/dashboard/media/${asset.id}`,
    };
  } catch (error) {
    await markMediaAssetFailedForVerifiedProject(project, asset.id).catch(() => undefined);

    if (error instanceof GalleryMediaValidationError) {
      throw error;
    }

    throw new InvitationImageUnavailableError();
  }
}

export async function removeInvitationImageForCurrentUser(input: {
  assetId: string;
  projectId: string;
  role: InvitationImageRole;
}): Promise<void> {
  const user = await requireCurrentUser();
  const project = await getOwnedProjectById(input.projectId, user.id);
  const draft = requireActiveDraft(await getActiveInvitationDraftForVerifiedProject(project));

  if (getConfiguredAssetId(draft, input.role) !== input.assetId) {
    throw new InvitationImageUnavailableError();
  }

  await removeInvitationImageMediaAssetWithAdmin({
    assetId: input.assetId,
    projectId: project.id,
    role: input.role,
  });
}

export async function updatePremiumGuestMediaConfigurationForCurrentUser(input: {
  configuration: {
    personOneSocialLinks: { instagram: string; tiktok: string; website: string };
    personTwoSocialLinks: { instagram: string; tiktok: string; website: string };
    weddingFilm: { caption: string; enabled: boolean; heading: string; url: string };
  };
  projectId: string;
}) {
  const user = await requireCurrentUser();
  const project = await getOwnedProjectById(input.projectId, user.id);
  const draft = requireActiveDraft(await getActiveInvitationDraftForVerifiedProject(project));
  const candidate = {
    ...draft.content,
    premiumMedia: {
      ...draft.content.premiumMedia,
      personOne: {
        ...draft.content.premiumMedia.personOne,
        socialLinks: input.configuration.personOneSocialLinks,
      },
      personTwo: {
        ...draft.content.premiumMedia.personTwo,
        socialLinks: input.configuration.personTwoSocialLinks,
      },
      weddingFilm: input.configuration.weddingFilm,
    },
  };
  const parsed = invitationDraftContentSchema.safeParse(candidate);

  if (!parsed.success) {
    throw new PremiumGuestMediaValidationError(
      parsed.error.issues[0]?.message ?? 'Konfigurasi media premium tidak valid.',
    );
  }

  return updateActiveInvitationDraftForVerifiedProject({
    content: parsed.data,
    draft,
    project,
  });
}

export async function assertInvitationPremiumMediaReadyForVerifiedProject(input: {
  project: OwnedProject;
  premiumMedia: {
    coverImageId: string | null;
    personOne: { imageId: string | null };
    personTwo: { imageId: string | null };
    storyImageId: string | null;
  };
}) {
  const ids = [
    input.premiumMedia.coverImageId,
    input.premiumMedia.personOne.imageId,
    input.premiumMedia.personTwo.imageId,
    input.premiumMedia.storyImageId,
  ].filter((id): id is string => Boolean(id));

  for (const id of ids) {
    const asset = await getMediaAssetForVerifiedProjectWithAdmin(input.project, id);
    if (
      !asset ||
      asset.media_kind !== INVITATION_IMAGE_MEDIA_KIND ||
      asset.status !== 'ready' ||
      asset.deleted_at !== null
    ) {
      throw new InvitationImageUnavailableError();
    }
  }
}
