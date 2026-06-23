import { getPublicPublishedMediaBinary } from '@/modules/media/public-media.service';
import { PublicMediaRepositoryError } from '@/modules/media/public-media.repository';
import { galleryMediaAssetIdSchema } from '@/modules/media/media.validation';

export const dynamic = 'force-static';
export const revalidate = 3600;

const publicCacheControl = 'public, s-maxage=3600, stale-while-revalidate=31532400';

type PublicMediaRouteProps = {
  params: Promise<{ assetId: string }>;
};

function publicNotFound() {
  return new Response(null, {
    status: 404,
    headers: {
      'Cache-Control': publicCacheControl,
    },
  });
}

/**
 * Cookie-free public binary proxy. It validates current snapshot membership,
 * project publication state, asset project ownership, ready status, and soft
 * deletion before reading a private Storage object with the service role.
 */
export async function GET(_request: Request, { params }: PublicMediaRouteProps) {
  const { assetId } = await params;
  const parsed = galleryMediaAssetIdSchema.safeParse(assetId);

  if (!parsed.success) {
    return publicNotFound();
  }

  try {
    const result = await getPublicPublishedMediaBinary(parsed.data);

    if (!result) {
      return publicNotFound();
    }

    return new Response(result.bytes, {
      headers: {
        'Cache-Control': publicCacheControl,
        'Content-Disposition': 'inline',
        'Content-Type': result.asset.mime_type,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    if (error instanceof PublicMediaRepositoryError) {
      console.error('Seraya public media metadata lookup failed.', {
        assetId,
        errorName: error.name,
      });
    } else {
      console.error('Seraya public media route failed.', {
        assetId,
        errorName: error instanceof Error ? error.name : 'UnknownError',
      });
    }

    return publicNotFound();
  }
}
