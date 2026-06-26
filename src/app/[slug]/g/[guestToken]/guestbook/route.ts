import { NextResponse } from 'next/server';

import { parsePersonalGuestbookFormData } from '@/modules/guestbook/guestbook.schema';
import { submitPersonalGuestbookEntry } from '@/modules/guestbook/guestbook.service';
import { buildConfiguredApplicationUrl } from '@/modules/runtime/app-origin';

export const dynamic = 'force-dynamic';

const privateResponseHeaders = {
  'Cache-Control': 'private, no-store, max-age=0',
  'Referrer-Policy': 'no-referrer',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'X-Content-Type-Options': 'nosniff',
};

type PersonalGuestbookRouteContext = {
  params: Promise<{ guestToken: string; slug: string }>;
};

function redirectToPersonalInvitation(input: {
  guestToken: string;
  outcome: 'error' | 'success';
  slug: string;
}) {
  const destination = buildConfiguredApplicationUrl(
    `/${encodeURIComponent(input.slug)}/g/${encodeURIComponent(input.guestToken)}?guestbook=${input.outcome}`,
  );
  const response = NextResponse.redirect(destination, 303);

  for (const [name, value] of Object.entries(privateResponseHeaders)) {
    response.headers.set(name, value);
  }

  return response;
}

/** Token-authorized guestbook endpoint. It accepts only message body plus current route capability. */
export async function POST(request: Request, context: PersonalGuestbookRouteContext) {
  const { guestToken, slug } = await context.params;
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return redirectToPersonalInvitation({ guestToken, outcome: 'error', slug });
  }

  const parsed = parsePersonalGuestbookFormData(formData);

  if (!parsed.success) {
    return redirectToPersonalInvitation({ guestToken, outcome: 'error', slug });
  }

  try {
    const result = await submitPersonalGuestbookEntry({
      message: parsed.data.message,
      slug,
      token: guestToken,
    });

    return redirectToPersonalInvitation({
      guestToken,
      outcome: result ? 'success' : 'error',
      slug,
    });
  } catch {
    return redirectToPersonalInvitation({ guestToken, outcome: 'error', slug });
  }
}
