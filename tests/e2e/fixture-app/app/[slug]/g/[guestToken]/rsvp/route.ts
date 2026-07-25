import { NextResponse } from 'next/server';

import {
  fixtureGuestToken,
  fixturePartySize,
  getFixtureCookieNames,
  getFixtureTemplateKey,
} from '../../../../../lib/fixture-state';

type FixtureRsvpRouteContext = {
  params: Promise<{ guestToken: string; slug: string }>;
};

export async function POST(request: Request, { params }: FixtureRsvpRouteContext) {
  const { guestToken, slug } = await params;

  if (!getFixtureTemplateKey(slug) || guestToken !== fixtureGuestToken) {
    return new Response('Not found', { status: 404 });
  }

  const formData = await request.formData();
  const status = formData.get('status');

  if (status !== 'attending' && status !== 'declined') {
    return new Response('Invalid RSVP status', { status: 400 });
  }

  const cookieNames = getFixtureCookieNames(slug);
  const redirectUrl = new URL(`/${slug}/g/${guestToken}`, request.url);
  redirectUrl.searchParams.set('rsvp', 'success');
  redirectUrl.hash = 'personal-guest-rsvp-title';

  const response = NextResponse.redirect(redirectUrl, { status: 303 });
  response.cookies.set(cookieNames.rsvpStatus, status, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
  });

  if (status === 'attending') {
    const attendeeCount = Number.parseInt(String(formData.get('attendeeCount') ?? ''), 10);

    if (!Number.isInteger(attendeeCount) || attendeeCount < 1 || attendeeCount > fixturePartySize) {
      return new Response('Invalid attendee count', { status: 400 });
    }

    response.cookies.set(cookieNames.attendeeCount, String(attendeeCount), {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
    });
  } else {
    response.cookies.delete(cookieNames.attendeeCount);
  }

  return response;
}
