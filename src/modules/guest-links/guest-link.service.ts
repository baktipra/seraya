import 'server-only';

import { requireCurrentUser } from '@/modules/auth/current-user';
import { assertGuestBelongsToProject, GuestAccessDeniedError } from '@/modules/guests/guest.policy';
import { getActiveGuestForVerifiedProjectWithAdmin } from '@/modules/guests/guest.repository';
import type { Guest } from '@/modules/guests/guest.types';
import { getOwnedProjectById, type OwnedProject } from '@/modules/projects/project.repository';

import {
  GuestLinkRepositoryError,
  listLatestGuestLinkStatesForVerifiedGuestIds,
  replacePersonalGuestLinkForVerifiedGuest,
  revokePersonalGuestLinkForVerifiedGuest,
} from './guest-link.repository';
import { buildPersonalGuestInvitationUrl } from './guest-link-url';
import type { GuestPersonalLinkCurrentState } from './guest-link.types';
import { generatePersonalGuestToken, hashPersonalGuestToken } from './guest-link-token';

export class GuestLinkUnavailableError extends Error {
  constructor() {
    super('The personal guest link is unavailable.');
    this.name = 'GuestLinkUnavailableError';
  }
}

/**
 * Controlled capability creation after a server-owned project and active guest
 * have already been verified. It is shared by Guest Manager and Delivery Center
 * so raw token material is generated in exactly one authority path.
 */
export async function createOrReplacePersonalGuestLinkForVerifiedGuest(input: {
  guest: Guest;
  project: OwnedProject;
}) {
  const guest = assertGuestBelongsToProject(input.guest, input.project.id);
  const token = generatePersonalGuestToken();

  await replacePersonalGuestLinkForVerifiedGuest({
    guestId: guest.id,
    tokenHash: hashPersonalGuestToken(token),
  });

  return {
    personalUrl: buildPersonalGuestInvitationUrl({ slug: input.project.slug, token }),
    recipientWhatsAppPhoneE164: guest.whatsapp_phone_e164,
  };
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

  return createOrReplacePersonalGuestLinkForVerifiedGuest({ guest, project });
}

/** Owner-only status check for Delivery Center replacement confirmation. */
export async function getLatestPersonalGuestLinkStateForVerifiedGuest(
  guestId: string,
): Promise<GuestPersonalLinkCurrentState> {
  const records = await listLatestGuestLinkStatesForVerifiedGuestIds([guestId]);
  const latestRecord = records.reduce<(typeof records)[number] | null>((latest, record) => {
    if (!latest || record.created_at > latest.created_at) {
      return record;
    }

    return latest;
  }, null);

  return latestRecord?.status ?? 'not_created';
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
