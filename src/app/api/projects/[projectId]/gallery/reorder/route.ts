import { NextResponse } from 'next/server';

import { AuthenticationRequiredError } from '@/modules/auth/current-user';
import {
  MediaGalleryOrderConflictError,
  MediaRepositoryError,
  MediaUploadUnavailableError,
  reorderGalleryImagesForCurrentUser,
} from '@/modules/media/media.service';
import { galleryMediaOrderSchema } from '@/modules/media/media.validation';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

export const dynamic = 'force-dynamic';

function privateJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

type ReorderGalleryRouteProps = {
  params: Promise<{ projectId: string }>;
};

export async function POST(request: Request, { params }: ReorderGalleryRouteProps) {
  const { projectId } = await params;
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return privateJson({ message: 'Urutan foto tidak valid.' }, { status: 400 });
  }

  const parsed = galleryMediaOrderSchema.safeParse(
    typeof payload === 'object' && payload !== null
      ? (payload as { imageIds?: unknown }).imageIds
      : undefined,
  );

  if (!parsed.success) {
    return privateJson(
      { message: parsed.error.issues[0]?.message ?? 'Urutan foto tidak valid.' },
      { status: 400 },
    );
  }

  try {
    await reorderGalleryImagesForCurrentUser({ imageIds: parsed.data, projectId });
    return privateJson({ imageIds: parsed.data, status: 'ok' });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return privateJson({ message: 'Masuk dulu untuk mengatur galeri.' }, { status: 401 });
    }

    if (error instanceof ProjectAccessDeniedError) {
      return privateJson({ message: 'Galeri tidak tersedia.' }, { status: 404 });
    }

    if (
      error instanceof MediaGalleryOrderConflictError ||
      error instanceof MediaUploadUnavailableError
    ) {
      return privateJson(
        { message: 'Daftar foto berubah. Muat ulang lalu atur kembali urutannya.' },
        { status: 409 },
      );
    }

    if (error instanceof MediaRepositoryError) {
      console.error('Seraya gallery reorder repository failure.', { projectId });
    } else {
      console.error('Seraya gallery reorder failed.', {
        errorName: error instanceof Error ? error.name : 'UnknownError',
        projectId,
      });
    }

    return privateJson({ message: 'Urutan foto belum dapat disimpan.' }, { status: 500 });
  }
}
