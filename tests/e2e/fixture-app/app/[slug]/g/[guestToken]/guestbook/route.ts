import { NextResponse } from 'next/server';

import {
  fixtureGuestToken,
  forcedGuestbookErrorMessage,
  getFixtureCookieNames,
  getFixtureTemplateKey,
} from '../../../../../lib/fixture-state';

type FixtureGuestbookRouteContext = {
  params: Promise<{ guestToken: string; slug: string }>;
};

export async function POST(request: Request, { params }: FixtureGuestbookRouteContext) {
  const { guestToken, slug } = await params;

  if (!getFixtureTemplateKey(slug) || guestToken !== fixtureGuestToken) {
    return new Response('Not found', { status: 404 });
  }

  const formData = await request.formData();
  const message = String(formData.get('message') ?? '').trim();
  const requestOrigin = request.headers.get('origin') ?? new URL(request.url).origin;
  const redirectUrl = new URL(`/${slug}/g/${guestToken}`, requestOrigin);
  redirectUrl.hash = 'personal-guestbook-title';

  if (!message || message.length > 600 || message === forcedGuestbookErrorMessage) {
    redirectUrl.searchParams.set('guestbook', 'error');
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }

  redirectUrl.searchParams.set('guestbook', 'success');
  const response = NextResponse.redirect(redirectUrl, { status: 303 });
  response.cookies.set(getFixtureCookieNames(slug).guestbookMessage, message, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
  });

  return response;
}
