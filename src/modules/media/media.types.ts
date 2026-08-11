import { INVITATION_IMAGE_MEDIA_KIND } from './invitation-image.types';

export const INVITATION_MEDIA_BUCKET = 'invitation-media' as const;
export const GALLERY_IMAGE_MEDIA_KIND = 'gallery_image' as const;
export const MAX_GALLERY_IMAGES = 12 as const;
export const MAX_GALLERY_IMAGE_BYTES = 10_485_760 as const;

export const SUPPORTED_GALLERY_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type GalleryImageMimeType = (typeof SUPPORTED_GALLERY_IMAGE_MIME_TYPES)[number];
export type InvitationImageMediaKind =
  | typeof GALLERY_IMAGE_MEDIA_KIND
  | typeof INVITATION_IMAGE_MEDIA_KIND;
export type MediaAssetStatus = 'uploaded' | 'processing' | 'ready' | 'failed' | 'deleted';

export type MediaAsset = {
  created_at: string;
  deleted_at: string | null;
  id: string;
  media_kind: InvitationImageMediaKind;
  mime_type: GalleryImageMimeType;
  project_id: string;
  size_bytes: number;
  status: MediaAssetStatus;
  storage_bucket: typeof INVITATION_MEDIA_BUCKET;
  storage_path: string;
  updated_at: string;
};

/** Render-safe gallery item. Storage paths and operational metadata stay server-only. */
export type InvitationGalleryImage = {
  alt: string;
  id: string;
  src: string;
};

export type MediaUploadReservation = {
  assetId: string;
  signedUploadUrl: string;
};

export function getPublishedMediaCacheTag(assetId: string) {
  return `published-media:${assetId}`;
}
