import { NextResponse } from 'next/server';

import { getPublishedInvitationAudioPlaybackUrl } from '@/modules/media/invitation-audio-playback.service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const privatePlaybackHeaders = {
  'Cache-Control': 'private, no-store, max-age=0',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
} as const;

type PublicAudioPlaybackRouteProps = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, { params }: PublicAudioPlaybackRouteProps) {
  const { slug } = await params;

  try {
    const signedUrl = await getPublishedInvitationAudioPlaybackUrl(slug);

    if (!signedUrl) {
      return new NextResponse(null, { headers: privatePlaybackHeaders, status: 404 });
    }

    return NextResponse.redirect(signedUrl, {
      headers: privatePlaybackHeaders,
      status: 307,
    });
  } catch (error) {
    console.error('Seraya published invitation audio playback failed.', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
    return new NextResponse(null, { headers: privatePlaybackHeaders, status: 404 });
  }
}
