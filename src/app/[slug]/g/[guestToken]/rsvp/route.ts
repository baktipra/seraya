import { NextResponse } from 'next/server';

import { parsePersonalGuestRsvpSubmission, submitPersonalGuestRsvp } from '@/modules/guest-links';
import { buildConfiguredApplicationUrl } from '@/modules/runtime/app-origin';

export const dynamic = 'force-dynamic';

const privateResponseHeaders = {
  'Cache-Control': 'private, no-store, max-age=0',
  'Referrer-Policy': 'no-referrer',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'X-Content-Type-Options': 'nosniff',
};

type PersonalGuestRsvpRouteContext = {
  params: Promise<{ guestToken: string; slug: string }>;
};

function unavailableResponse() {
  return new NextResponse(null, { headers: privateResponseHeaders, status: 404 });
}

/** Token-authorized RSVP endpoint. It accepts no guest/project identifiers or party-size limit. */
export async function POST(request: Request, context: PersonalGuestRsvpRouteContext) {
  const { guestToken, slug } = await context.params;
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return unavailableResponse();
  }

  const parsed = parsePersonalGuestRsvpSubmission(formData);
  if (!parsed.success) {
    return unavailableResponse();
  }

  const updatedStatus = await submitPersonalGuestRsvp({
    attendeeCount: parsed.data.attendeeCount,
    slug,
    status: parsed.data.status,
    token: guestToken,
  });

  if (!updatedStatus) {
    return unavailableResponse();
  }

  const destination = buildConfiguredApplicationUrl(
    `/${encodeURIComponent(slug)}/g/${encodeURIComponent(guestToken)}?rsvp=success`,
  );
  const response = NextResponse.redirect(destination, 303);

  for (const [name, value] of Object.entries(privateResponseHeaders)) {
    response.headers.set(name, value);
  }

  return response;
}
