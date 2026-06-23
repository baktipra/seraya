import { NextResponse } from 'next/server';

import { AuthenticationRequiredError } from '@/modules/auth/current-user';
import {
  MediaAccessDeniedError,
  MediaUploadUnavailableError,
  reserveGalleryUploadForCurrentUser,
} from '@/modules/media/media.service';
import {
  galleryMediaReservationSchema,
  GalleryMediaValidationError,
} from '@/modules/media/media.validation';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

export const dynamic = 'force-dynamic';

function privateJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

type ReserveGalleryRouteProps = {
  params: Promise<{ projectId: string }>;
};

export async function POST(request: Request, { params }: ReserveGalleryRouteProps) {
  const { projectId } = await params;
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return privateJson({ message: 'Data foto tidak valid.' }, { status: 400 });
  }

  const parsed = galleryMediaReservationSchema.safeParse(payload);

  if (!parsed.success) {
    return privateJson(
      { message: parsed.error.issues[0]?.message ?? 'Data foto tidak valid.' },
      { status: 400 },
    );
  }

  try {
    const reservation = await reserveGalleryUploadForCurrentUser({
      projectId,
      upload: parsed.data,
    });

    return privateJson(reservation, { status: 201 });
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
        { message: 'Foto belum bisa disiapkan. Coba lagi beberapa saat lagi.' },
        { status: 409 },
      );
    }

    console.error('Seraya gallery media reserve failed.', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
      projectId,
    });
    return privateJson(
      { message: 'Foto belum bisa disiapkan. Coba lagi beberapa saat lagi.' },
      { status: 500 },
    );
  }
}
