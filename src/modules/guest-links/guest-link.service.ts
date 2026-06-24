import 'server-only';

import { requireCurrentUser } from '@/modules/auth/current-user';
import { assertGuestBelongsToProject, GuestAccessDeniedError } from '@/modules/guests/guest.policy';
import { getActiveGuestForVerifiedProjectWithAdmin } from '@/modules/guests/guest.repository';
import { getOwnedProjectById } from '@/modules/projects/project.repository';

import {
  GuestLinkRepositoryError,
  replacePersonalGuestLinkForVerifiedGuest,
  revokePersonalGuestLinkForVerifiedGuest,
} from './guest-link.repository';
import { buildPersonalGuestInvitationUrl } from './guest-link-url';
import { generatePersonalGuestToken, hashPersonalGuestToken } from './guest-link-token';

export class GuestLinkUnavailableError extends Error {
  constructor() {
    super('The personal guest link is unavailable.');
    this.name = 'GuestLinkUnavailableError';
  }
}

/** Generates raw capability material only after owner + active guest checks pass. */
export async function createOrReplacePersonalGuestLinkForCurrentUser(input: {
  guestId: string;
  projectId: string;
}) {
  const user = await requireCurrentUser();
  const project = await getOwnedProjectById(input.projectId, user.id);
  const guest = assertGuestBelongsToProject(
    await getActiveGuestForVerifiedProjectWithAdmin(project, input.guestId),
    project.id,
  );
  const token = generatePersonalGuestToken();

  await replacePersonalGuestLinkForVerifiedGuest({
    guestId: guest.id,
    tokenHash: hashPersonalGuestToken(token),
  });

  return {
    personalUrl: buildPersonalGuestInvitationUrl({ slug: project.slug, token }),
    recipientWhatsAppPhoneE164: guest.whatsapp_phone_e164,
  };
}

/** Owner-only revocation; the database function atomically targets active link state. */
export async function revokePersonalGuestLinkForCurrentUser(input: {
  guestId: string;
  projectId: string;
}) {
  const user = await requireCurrentUser();
  const project = await getOwnedProjectById(input.projectId, user.id);
  const guest = assertGuestBelongsToProject(
    await getActiveGuestForVerifiedProjectWithAdmin(project, input.guestId),
    project.id,
  );

  await revokePersonalGuestLinkForVerifiedGuest(guest.id);
}

export function isGuestLinkFailure(error: unknown) {
  return error instanceof GuestLinkRepositoryError || error instanceof GuestLinkUnavailableError;
}

export { GuestAccessDeniedError };
