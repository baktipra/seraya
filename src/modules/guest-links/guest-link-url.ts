import 'server-only';

import { buildConfiguredApplicationUrl } from '@/modules/runtime/app-origin';

export function buildPersonalGuestInvitationUrl(input: { slug: string; token: string }) {
  return buildConfiguredApplicationUrl(
    `/${encodeURIComponent(input.slug)}/g/${encodeURIComponent(input.token)}`,
  );
}
