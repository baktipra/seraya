import 'server-only';

import { getCachedCurrentPublishedInvitationBySlug } from './public-invitation.repository';

/** Public runtime loader: snapshot-only, anonymous-safe, and cacheable. */
export async function getPublicInvitationBySlug(slug: string) {
  return getCachedCurrentPublishedInvitationBySlug(slug);
}
