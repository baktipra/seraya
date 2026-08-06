import 'server-only';

import { randomUUID } from 'node:crypto';

import { requireCurrentUser } from '@/modules/auth/current-user';
import { getActiveInvitationDraftForVerifiedProject } from '@/modules/invitations/invitation-draft.repository';
import { invitationDraftContentSchema } from '@/modules/invitations/invitation-draft.schema';
import { getOwnedProjectById } from '@/modules/projects/project.repository';

import { mapPrivateGalleryAssetsToInvitationImages } from './media.mapper';
import {
  createSignedMediaUploadUrl,
  downloadMediaAssetBytes,
  finalizeGalleryMediaAssetWithAdmin,
  getMediaAssetForVerifiedProjectWithAdmin,
  getOwnedReadyMediaAssetById,
  getReadyMediaAssetsForVerifiedProject,
  markMediaAssetFailedForVerifiedProject,
  reserveProcessingGalleryMediaAsset,
  updateInvitationDraftGalleryForVerifiedProject,
} from './media.repository';
import {
  GALLERY_IMAGE_MEDIA_KIND,
  INVITATION_MEDIA_BUCKET,
  MAX_GALLERY_IMAGES,
  type GalleryImageMimeType,
  type InvitationGalleryImage,
  type MediaAsset,
  type MediaUploadReservation,
} from './media.types';
import {
  GalleryMediaValidationError,
  getGalleryImageExtension,
  validateGalleryImageBytes,
} from './media.validation';

export class MediaAccessDeniedError extends Error {
  constructor() {
    super('The media resource is not available to the current account.');
    this.name = 'MediaAccessDeniedError';
  }
}

export class MediaUploadUnavailableError extends Error {
  constructor() {
    super('The media upload is not available.');
    this.name = 'MediaUploadUnavailableError';
  }
}

export class MediaGalleryOrderConflictError extends Error {
  constructor() {
    super('The gallery order no longer matches the active draft.');
    this.name = 'MediaGalleryOrderConflictError';
  }
}

export function isGalleryOrderPermutation(currentIds: string[], nextIds: string[]) {
  return (
    currentIds.length === nextIds.length &&
    new Set(nextIds).size === nextIds.length &&
    currentIds.every((id) => nextIds.includes(id))
  );
}

type GalleryMediaReservationInput = {
  mimeType: GalleryImageMimeType;
  sizeBytes: number;
};
type GalleryMediaAssetId = string;

function buildOpaqueGalleryStoragePath(input: {
  assetId: string;
  mimeType: GalleryMediaReservationInput['mimeType'];
  projectId: string;
}) {
  return `projects/${input.projectId}/gallery/${input.assetId}.${getGalleryImageExtension(input.mimeType)}`;
}

function requireActiveDraft<T>(draft: T | null): T {
  if (!draft) {
    throw new MediaUploadUnavailableError();
  }

  return draft;
}

function assertGalleryCapacity(imageIds: string[]) {
  if (imageIds.length >= MAX_GALLERY_IMAGES) {
    throw new GalleryMediaValidationError('Galeri undangan maksimal berisi 12 foto.');
  }
}

/**
 * Server-owned reserve step. The browser only receives a short-lived upload
 * transport URL; path and metadata remain absent from all rendered HTML.
 */
export async function reserveGalleryUploadForCurrentUser(input: {
  projectId: string;
  upload: GalleryMediaReservationInput;
}): Promise<MediaUploadReservation> {
  const user = await requireCurrentUser();
  const project = await getOwnedProjectById(input.projectId, user.id);
  const draft = requireActiveDraft(await getActiveInvitationDraftForVerifiedProject(project));

  assertGalleryCapacity(draft.content.gallery.imageIds);

  const assetId = randomUUID();
  const storagePath = buildOpaqueGalleryStoragePath({
    assetId,
    mimeType: input.upload.mimeType,
    projectId: project.id,
  });
  const asset = await reserveProcessingGalleryMediaAsset({
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

/**
 * Re-downloads private Storage bytes with the service role, validates their
 * magic signature, and uses M0008's one transaction to mark the asset ready
 * plus append exactly one gallery ID to the active draft.
 */
export async function finalizeGalleryUploadForCurrentUser(input: {
  assetId: GalleryMediaAssetId;
  projectId: string;
}): Promise<InvitationGalleryImage> {
  const user = await requireCurrentUser();
  const project = await getOwnedProjectById(input.projectId, user.id);
  const draft = requireActiveDraft(await getActiveInvitationDraftForVerifiedProject(project));
  const asset = await getMediaAssetForVerifiedProjectWithAdmin(project, input.assetId);

  if (
    !asset ||
    asset.status !== 'processing' ||
    asset.deleted_at !== null ||
    asset.media_kind !== GALLERY_IMAGE_MEDIA_KIND ||
    asset.storage_bucket !== INVITATION_MEDIA_BUCKET
  ) {
    throw new MediaUploadUnavailableError();
  }

  try {
    // Keep the app boundary strict even though the database function also
    // enforces gallery cap/duplicate atomicity below.
    invitationDraftContentSchema.parse(draft.content);
    assertGalleryCapacity(draft.content.gallery.imageIds);

    const blob = await downloadMediaAssetBytes(asset);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const detectedMimeType = validateGalleryImageBytes({
      bytes,
      declaredMimeType: asset.mime_type,
      declaredSizeBytes: asset.size_bytes,
    });

    await finalizeGalleryMediaAssetWithAdmin({
      assetId: asset.id,
      mimeType: detectedMimeType,
      sizeBytes: bytes.byteLength,
    });
  } catch (error) {
    await markMediaAssetFailedForVerifiedProject(project, asset.id).catch(() => undefined);

    if (error instanceof GalleryMediaValidationError) {
      throw error;
    }

    throw new MediaUploadUnavailableError();
  }

  return {
    alt: `Foto pasangan ${draft.content.gallery.imageIds.length + 1}`,
    id: asset.id,
    src: `/dashboard/media/${asset.id}`,
  };
}

/** Removal only changes live draft gallery order; it never deletes the asset/object. */
export async function removeGalleryImageFromDraftForCurrentUser(input: {
  assetId: GalleryMediaAssetId;
  projectId: string;
}): Promise<void> {
  const user = await requireCurrentUser();
  const project = await getOwnedProjectById(input.projectId, user.id);
  const draft = requireActiveDraft(await getActiveInvitationDraftForVerifiedProject(project));
  const asset = await getMediaAssetForVerifiedProjectWithAdmin(project, input.assetId);

  if (!asset || asset.deleted_at !== null || asset.media_kind !== GALLERY_IMAGE_MEDIA_KIND) {
    throw new MediaUploadUnavailableError();
  }

  const remainingImageIds = draft.content.gallery.imageIds.filter((id) => id !== input.assetId);

  if (remainingImageIds.length === draft.content.gallery.imageIds.length) {
    throw new MediaUploadUnavailableError();
  }

  const content = invitationDraftContentSchema.parse({
    ...draft.content,
    gallery: {
      enabled: remainingImageIds.length > 0,
      imageIds: remainingImageIds,
    },
  });

  await updateInvitationDraftGalleryForVerifiedProject({ content, project });
}

/** Owner-only reorder. It accepts only an exact permutation of current draft IDs. */
export async function reorderGalleryImagesForCurrentUser(input: {
  imageIds: string[];
  projectId: string;
}): Promise<void> {
  const user = await requireCurrentUser();
  const project = await getOwnedProjectById(input.projectId, user.id);
  const draft = requireActiveDraft(await getActiveInvitationDraftForVerifiedProject(project));

  if (!isGalleryOrderPermutation(draft.content.gallery.imageIds, input.imageIds)) {
    throw new MediaGalleryOrderConflictError();
  }

  const content = invitationDraftContentSchema.parse({
    ...draft.content,
    gallery: {
      enabled: draft.content.gallery.enabled,
      imageIds: input.imageIds,
    },
  });

  await updateInvitationDraftGalleryForVerifiedProject({ content, project });
}

/** Owner-only private preview/gallery manager resolver. Missing or invalid IDs omit cleanly. */
export async function getPrivateGalleryImagesForVerifiedProject(input: {
  draftImageIds: string[];
  project: Awaited<ReturnType<typeof getOwnedProjectById>>;
}): Promise<InvitationGalleryImage[]> {
  if (input.draftImageIds.length === 0) {
    return [];
  }

  const assets = await getReadyMediaAssetsForVerifiedProject(input.project, input.draftImageIds);
  return mapPrivateGalleryAssetsToInvitationImages(input.draftImageIds, assets);
}

/** Owner-only binary route lookup. No storage path is returned to UI callers. */
export async function getOwnedMediaBinaryForCurrentUser(
  assetId: GalleryMediaAssetId,
): Promise<MediaAsset> {
  await requireCurrentUser();
  const asset = await getOwnedReadyMediaAssetById(assetId);

  if (!asset) {
    throw new MediaAccessDeniedError();
  }

  return asset;
}
