import { NextResponse } from 'next/server';

import { AuthenticationRequiredError } from '@/modules/auth/current-user';
import {
  finalizeInvitationImageUploadForCurrentUser,
  InvitationImageUnavailableError,
} from '@/modules/media/invitation-image.service';
import { invitationImageFinalizeSchema } from '@/modules/media/invitation-image.validation';
import { GalleryMediaValidationError } from '@/modules/media/media.validation';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

export const dynamic = 'force-dynamic';

function privateJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

type RouteProps = { params: Promise<{ projectId: string }> };

export async function POST(request: Request, { params }: RouteProps) {
  const { projectId } = await params;
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return privateJson({ message: 'Data foto tidak valid.' }, { status: 400 });
  }

  const parsed = invitationImageFinalizeSchema.safeParse(payload);
  if (!parsed.success) {
    return privateJson({ message: parsed.error.issues[0]?.message ?? 'Data foto tidak valid.' }, { status: 400 });
  }

  try {
    const image = await finalizeInvitationImageUploadForCurrentUser({
      assetId: parsed.data.assetId,
      projectId,
      role: parsed.data.role,
    });
    return privateJson({ image });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return privateJson({ message: 'Masuk dulu untuk menyelesaikan foto.' }, { status: 401 });
    }
    if (error instanceof ProjectAccessDeniedError || error instanceof InvitationImageUnavailableError) {
      return privateJson({ message: 'Foto tidak tersedia untuk undangan ini.' }, { status: 404 });
    }
    if (error instanceof GalleryMediaValidationError) {
      return privateJson({ message: error.message }, { status: 400 });
    }

    console.error('Seraya featured media finalize failed.', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
      projectId,
    });
    return privateJson({ message: 'Foto belum bisa diselesaikan. Coba unggah lagi.' }, { status: 500 });
  }
}
