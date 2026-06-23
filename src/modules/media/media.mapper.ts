import type { InvitationGalleryImage, MediaAsset } from './media.types';

function hasUuidShape(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function toGalleryImage(id: string, src: string, index: number): InvitationGalleryImage {
  return {
    alt: `Foto pasangan ${index + 1}`,
    id,
    src,
  };
}

/** Maps owner-resolved ready assets to a private Seraya binary route only. */
export function mapPrivateGalleryAssetsToInvitationImages(
  orderedAssetIds: string[],
  assets: MediaAsset[],
): InvitationGalleryImage[] {
  const assetById = new Map(
    assets
      .filter((asset) => asset.status === 'ready' && asset.deleted_at === null)
      .map((asset) => [asset.id, asset]),
  );

  return orderedAssetIds.flatMap((assetId, index) => {
    if (!assetById.has(assetId)) {
      return [];
    }

    return [toGalleryImage(assetId, `/dashboard/media/${assetId}`, index)];
  });
}

/**
 * Snapshot IDs are already strict UUID values at the published contract
 * boundary. The binary route is still the authoritative current-public-media
 * gate, and no Storage path is carried into the visual renderer.
 */
export function mapPublishedGalleryIdsToInvitationImages(
  orderedAssetIds: string[],
): InvitationGalleryImage[] {
  return orderedAssetIds.flatMap((assetId, index) =>
    hasUuidShape(assetId) ? [toGalleryImage(assetId, `/media/${assetId}`, index)] : [],
  );
}
