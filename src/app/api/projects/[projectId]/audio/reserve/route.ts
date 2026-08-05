import { NextResponse } from 'next/server';

import { AuthenticationRequiredError } from '@/modules/auth/current-user';
import {
  InvitationAudioUnavailableError,
  reserveInvitationAudioUploadForCurrentUser,
} from '@/modules/media/invitation-audio.service';
import {
  invitationAudioReservationSchema,
  InvitationAudioValidationError,
} from '@/modules/media/invitation-audio.validation';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

export const dynamic = 'force-dynamic';

function privateJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

type AudioRouteProps = {
  params: Promise<{ projectId: string }>;
};

export async function POST(request: Request, { params }: AudioRouteProps) {
  const { projectId } = await params;
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return privateJson({ message: 'Data audio tidak valid.' }, { status: 400 });
  }

  const parsed = invitationAudioReservationSchema.safeParse(payload);
  if (!parsed.success) {
    return privateJson(
      { message: parsed.error.issues[0]?.message ?? 'Data audio tidak valid.' },
      { status: 400 },
    );
  }

  try {
    const reservation = await reserveInvitationAudioUploadForCurrentUser({
      projectId,
      upload: parsed.data,
    });
    return privateJson(reservation, { status: 201 });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return privateJson({ message: 'Masuk dulu untuk mengelola audio.' }, { status: 401 });
    }

    if (
      error instanceof ProjectAccessDeniedError ||
      error instanceof InvitationAudioUnavailableError
    ) {
      return privateJson({ message: 'Audio tidak tersedia untuk undangan ini.' }, { status: 404 });
    }

    if (error instanceof InvitationAudioValidationError) {
      return privateJson({ message: error.message }, { status: 400 });
    }

    console.error('Seraya invitation audio reserve failed.', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
      projectId,
    });
    return privateJson(
      { message: 'Audio belum bisa diproses. Coba lagi beberapa saat lagi.' },
      { status: 500 },
    );
  }
}
