import { AuthenticationRequiredError } from '@/modules/auth/current-user';
import {
  MediaAccessDeniedError,
  getOwnedMediaBinaryForCurrentUser,
} from '@/modules/media/media.service';
import {
  downloadMediaAssetBytes,
  MediaAssetUnavailableError,
} from '@/modules/media/media.repository';
import { galleryMediaAssetIdSchema } from '@/modules/media/media.validation';

export const dynamic = 'force-dynamic';

function privateResponse(status: number, body?: BodyInit | null) {
  return new Response(body ?? null, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

type PrivateMediaRouteProps = {
  params: Promise<{ assetId: string }>;
};

/** Owner-only dashboard media proxy. It never renders Storage URLs or paths. */
export async function GET(_request: Request, { params }: PrivateMediaRouteProps) {
  const { assetId } = await params;
  const parsed = galleryMediaAssetIdSchema.safeParse(assetId);

  if (!parsed.success) {
    return privateResponse(404);
  }

  try {
    const asset = await getOwnedMediaBinaryForCurrentUser(parsed.data);
    const blob = await downloadMediaAssetBytes(asset);

    return new Response(blob, {
      headers: {
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Disposition': 'inline',
        'Content-Type': asset.mime_type,
      },
    });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return privateResponse(401);
    }

    if (error instanceof MediaAccessDeniedError || error instanceof MediaAssetUnavailableError) {
      return privateResponse(404);
    }

    console.error('Seraya private media route failed.', {
      assetId,
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
    return privateResponse(404);
  }
}
