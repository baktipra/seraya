import 'server-only';

import { unstable_cache } from 'next/cache';

import { getCurrentPublicMediaAssetById } from './media.repository';
import { getPublishedMediaCacheTag, type MediaAsset } from './media.types';
import { galleryMediaAssetIdSchema } from './media.validation';

export class PublicMediaRepositoryError extends Error {
  constructor() {
    super('The public media repository could not complete the request.');
    this.name = 'PublicMediaRepositoryError';
  }
}

export function isSafePublicMediaAssetId(assetId: string) {
  return galleryMediaAssetIdSchema.safeParse(assetId).success;
}

/**
 * Stateless, cache-tagged metadata lookup for the public binary proxy. The
 * repository uses server-only privilege internally but verifies current snapshot,
 * published project, project ownership, ready lifecycle, and soft-delete state
 * before exposing an asset to the route.
 */
export async function getCachedCurrentPublicMediaAssetById(
  assetId: string,
): Promise<MediaAsset | null> {
  if (!isSafePublicMediaAssetId(assetId)) {
    return null;
  }

  const getCached = unstable_cache(
    async () => getCurrentPublicMediaAssetById(assetId),
    ['published-media', assetId],
    {
      revalidate: 3600,
      tags: [getPublishedMediaCacheTag(assetId)],
    },
  );

  try {
    return await getCached();
  } catch (error) {
    if (error instanceof Error) {
      throw new PublicMediaRepositoryError();
    }

    throw error;
  }
}
