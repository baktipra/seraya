import 'server-only';

import { mapPublishedGalleryIdsToInvitationImages } from './media.mapper';
import { downloadMediaAssetBytes } from './media.repository';
import type { InvitationGalleryImage } from './media.types';
import { getCachedCurrentPublicMediaAssetById } from './public-media.repository';

/** Public binary lookup only; it has no cookie/session/dashboard dependency. */
export async function getPublicPublishedMediaBinary(assetId: string) {
  const asset = await getCachedCurrentPublicMediaAssetById(assetId);

  if (!asset) {
    return null;
  }

  const bytes = await downloadMediaAssetBytes(asset);
  return { asset, bytes };
}

/**
 * Public Roselle can render only assets that pass the same current-snapshot
 * visibility gate as /media/[assetId]. This avoids emitting broken image tags
 * for missing, deleted, failed, or otherwise unavailable snapshot IDs.
 */
export async function getPublicGalleryImagesForCurrentSnapshot(
  imageIds: string[],
): Promise<InvitationGalleryImage[]> {
  const candidates = mapPublishedGalleryIdsToInvitationImages(imageIds);
  const visible = await Promise.all(
    candidates.map(async (image) => {
      const asset = await getCachedCurrentPublicMediaAssetById(image.id);
      return asset ? image : null;
    }),
  );

  return visible.filter((image): image is InvitationGalleryImage => image !== null);
}
