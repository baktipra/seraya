import { NextResponse } from 'next/server';

import { AuthenticationRequiredError } from '@/modules/auth/current-user';
import {
  MediaAccessDeniedError,
  MediaUploadUnavailableError,
  removeGalleryImageFromDraftForCurrentUser,
} from '@/modules/media/media.service';
import { galleryMediaAssetIdSchema } from '@/modules/media/media.validation';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

export const dynamic = 'force-dynamic';

function privateJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

type RemoveGalleryRouteProps = {
  params: Promise<{ projectId: string }>;
};

export async function POST(request: Request, { params }: RemoveGalleryRouteProps) {
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
    await removeGalleryImageFromDraftForCurrentUser({ assetId: parsed.data, projectId });
    return privateJson({ status: 'ok' });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return privateJson({ message: 'Masuk dulu untuk mengelola foto.' }, { status: 401 });
    }

    if (error instanceof ProjectAccessDeniedError || error instanceof MediaAccessDeniedError) {
      return privateJson(
        { message: 'Foto tidak dapat dihapus dari undangan ini.' },
        { status: 404 },
      );
    }

    if (error instanceof MediaUploadUnavailableError) {
      return privateJson({ message: 'Foto tidak dapat dihapus dari galeri.' }, { status: 409 });
    }

    console.error('Seraya gallery media remove failed.', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
      projectId,
    });
    return privateJson({ message: 'Foto tidak dapat dihapus dari galeri.' }, { status: 500 });
  }
}
