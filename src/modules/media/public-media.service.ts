import 'server-only';

import type { InvitationDraftContent } from '@/modules/invitations/invitation-draft.schema';

import { mapPublishedGalleryIdsToInvitationImages } from './media.mapper';
import { downloadMediaAssetBytes } from './media.repository';
import type { InvitationGalleryImage } from './media.types';
import type { InvitationPremiumMediaImages } from './invitation-image.types';
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
 * Public invitation gallery can render only assets that pass the same
 * current-snapshot visibility gate as /media/[assetId].
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

async function resolvePublicPremiumImage(assetId: string | null, alt: string) {
  if (!assetId) return null;
  const asset = await getCachedCurrentPublicMediaAssetById(assetId);
  return asset ? { alt, id: assetId, src: `/media/${assetId}` } : null;
}

export async function getPublicPremiumMediaImagesForCurrentSnapshot(
  premiumMedia: InvitationDraftContent['premiumMedia'],
): Promise<InvitationPremiumMediaImages> {
  const [cover, personOne, personTwo, story] = await Promise.all([
    resolvePublicPremiumImage(premiumMedia.coverImageId, 'Foto cover pasangan'),
    resolvePublicPremiumImage(premiumMedia.personOne.imageId, 'Potret mempelai pertama'),
    resolvePublicPremiumImage(premiumMedia.personTwo.imageId, 'Potret mempelai kedua'),
    resolvePublicPremiumImage(premiumMedia.storyImageId, 'Foto cerita pasangan'),
  ]);

  return { cover, personOne, personTwo, story };
}
