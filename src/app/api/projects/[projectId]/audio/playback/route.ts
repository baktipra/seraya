import { NextResponse } from 'next/server';

import { AuthenticationRequiredError } from '@/modules/auth/current-user';
import { getInvitationAudioPlaybackUrlForCurrentUser } from '@/modules/media/invitation-audio-playback.service';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const privatePlaybackHeaders = {
  'Cache-Control': 'private, no-store, max-age=0',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
} as const;

type OwnerAudioPlaybackRouteProps = {
  params: Promise<{ projectId: string }>;
};

export async function GET(_request: Request, { params }: OwnerAudioPlaybackRouteProps) {
  const { projectId } = await params;

  try {
    const signedUrl = await getInvitationAudioPlaybackUrlForCurrentUser(projectId);

    if (!signedUrl) {
      return new NextResponse(null, { headers: privatePlaybackHeaders, status: 404 });
    }

    return NextResponse.redirect(signedUrl, {
      headers: privatePlaybackHeaders,
      status: 307,
    });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return new NextResponse(null, { headers: privatePlaybackHeaders, status: 401 });
    }

    if (error instanceof ProjectAccessDeniedError) {
      return new NextResponse(null, { headers: privatePlaybackHeaders, status: 404 });
    }

    console.error('Seraya owner preview audio playback failed.', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
      projectId,
    });
    return new NextResponse(null, { headers: privatePlaybackHeaders, status: 404 });
  }
}
