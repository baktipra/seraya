import { NextResponse } from 'next/server';

import { AuthenticationRequiredError } from '@/modules/auth/current-user';
import {
  PremiumGuestMediaValidationError,
  updatePremiumGuestMediaConfigurationForCurrentUser,
} from '@/modules/media/invitation-image.service';
import { premiumGuestMediaConfigurationSchema } from '@/modules/media/invitation-image.validation';
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
    return privateJson({ message: 'Konfigurasi media tidak valid.' }, { status: 400 });
  }

  const parsed = premiumGuestMediaConfigurationSchema.safeParse(payload);
  if (!parsed.success) {
    return privateJson(
      { message: parsed.error.issues[0]?.message ?? 'Konfigurasi media tidak valid.' },
      { status: 400 },
    );
  }

  try {
    const draft = await updatePremiumGuestMediaConfigurationForCurrentUser({
      configuration: parsed.data,
      projectId,
    });
    return privateJson({ premiumMedia: draft.content.premiumMedia });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return privateJson({ message: 'Masuk dulu untuk menyimpan media.' }, { status: 401 });
    }
    if (error instanceof ProjectAccessDeniedError) {
      return privateJson({ message: 'Project tidak tersedia.' }, { status: 404 });
    }
    if (error instanceof PremiumGuestMediaValidationError) {
      return privateJson({ message: error.message }, { status: 400 });
    }

    console.error('Seraya premium media configuration failed.', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
      projectId,
    });
    return privateJson({ message: 'Konfigurasi media belum bisa disimpan. Coba lagi.' }, { status: 500 });
  }
}
