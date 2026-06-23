import { NextResponse } from 'next/server';

import { AuthenticationRequiredError } from '@/modules/auth/current-user';
import {
  MediaAccessDeniedError,
  MediaUploadUnavailableError,
  finalizeGalleryUploadForCurrentUser,
} from '@/modules/media/media.service';
import {
  galleryMediaAssetIdSchema,
  GalleryMediaValidationError,
} from '@/modules/media/media.validation';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

export const dynamic = 'force-dynamic';

function privateJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

type FinalizeGalleryRouteProps = {
  params: Promise<{ projectId: string }>;
};

export async function POST(request: Request, { params }: FinalizeGalleryRouteProps) {
  const { projectId } = await params;
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return privateJson({ message: 'Foto tidak valid.' }, { status: 400 });
  }

  const parsed = galleryMediaAssetIdSchema.safeParse(
    typeof payload === 'object' && payload !== null
      ? (payload as { assetId?: unknown }).assetId
      : undefined,
  );

  if (!parsed.success) {
    return privateJson({ message: 'Foto tidak valid.' }, { status: 400 });
  }

  try {
    const image = await finalizeGalleryUploadForCurrentUser({
      assetId: parsed.data,
      projectId,
    });

    return privateJson({ image });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return privateJson({ message: 'Masuk dulu untuk mengunggah foto.' }, { status: 401 });
    }

    if (error instanceof ProjectAccessDeniedError || error instanceof MediaAccessDeniedError) {
      return privateJson(
        { message: 'Foto tidak dapat ditambahkan ke undangan ini.' },
        { status: 404 },
      );
    }

    if (error instanceof GalleryMediaValidationError) {
      return privateJson({ message: error.message }, { status: 400 });
    }

    if (error instanceof MediaUploadUnavailableError) {
      return privateJson(
        { message: 'Foto belum bisa diselesaikan. Coba unggah lagi.' },
        { status: 409 },
      );
    }

    console.error('Seraya gallery media finalization failed.', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
      projectId,
    });
    return privateJson(
      { message: 'Foto belum bisa diselesaikan. Coba unggah lagi.' },
      { status: 500 },
    );
  }
}
