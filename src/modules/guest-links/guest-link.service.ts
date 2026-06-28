import 'server-only';

import { requireCurrentUser } from '@/modules/auth/current-user';
import { assertGuestBelongsToProject, GuestAccessDeniedError } from '@/modules/guests/guest.policy';
import { getActiveGuestForVerifiedProjectWithAdmin } from '@/modules/guests/guest.repository';
import type { Guest } from '@/modules/guests/guest.types';
import { getOwnedProjectById, type OwnedProject } from '@/modules/projects/project.repository';

import {
  GuestLinkActiveLinkExistsError,
  GuestLinkRepositoryError,
  createPersonalGuestLinkIfNoneActiveWithCiphertextForVerifiedGuest,
  getActiveRecoverableGuestLinkRecordForVerifiedGuest,
  listLatestGuestLinkStatesForVerifiedGuestIds,
  replacePersonalGuestLinkWithCiphertextForVerifiedGuest,
  revokePersonalGuestLinkForVerifiedGuest,
} from './guest-link.repository';
import {
  decryptPersonalGuestToken,
  encryptPersonalGuestToken,
  PersonalGuestLinkEncryptionError,
} from './guest-link-encryption';
import { buildPersonalGuestInvitationUrl } from './guest-link-url';
import type { GuestPersonalLinkCurrentState } from './guest-link.types';
import { generatePersonalGuestToken, hashPersonalGuestToken } from './guest-link-token';

export class GuestLinkUnavailableError extends Error {
  constructor() {
    super('The personal guest link is unavailable.');
    this.name = 'GuestLinkUnavailableError';
  }
}

/** Active legacy links remain valid but cannot be re-accessed until an owner explicitly replaces them. */
export class GuestLinkLegacyUpgradeRequiredError extends Error {
  constructor() {
    super('The active personal guest link is legacy and cannot be re-accessed.');
    this.name = 'GuestLinkLegacyUpgradeRequiredError';
  }
}

/** Minimum server-only guest shape required by the existing link authority. */
export type PersonalGuestLinkPreparationTarget = Pick<
  Guest,
  'deleted_at' | 'id' | 'project_id' | 'whatsapp_phone_e164'
>;

function createEncryptedCapability(token: string) {
  const encrypted = encryptPersonalGuestToken(token);

  return {
    tokenCiphertext: encrypted.ciphertext,
    tokenHash: hashPersonalGuestToken(token),
    tokenKeyVersion: encrypted.keyVersion,
  };
}

/**
 * One private capability mutation. Raw capability material never leaves this
 * helper, which is used by batch preparation after delivery already verified
 * owner, project, active guests, and current link-state eligibility.
 */
export async function preparePersonalGuestLinkForVerifiedGuestWithoutReveal(input: {
  guest: PersonalGuestLinkPreparationTarget;
  project: OwnedProject;
}): Promise<void> {
  const guest = assertGuestBelongsToProject(input.guest, input.project.id);
  const token = generatePersonalGuestToken();

  await createPersonalGuestLinkIfNoneActiveWithCiphertextForVerifiedGuest({
    guestId: guest.id,
    ...createEncryptedCapability(token),
  });
}

/**
 * Controlled capability creation after a server-owned project and active guest
 * have already been verified. It is shared by Guest Manager and Delivery Center
 * so raw token material is generated in exactly one authority path.
 */
export async function createOrReplacePersonalGuestLinkForVerifiedGuest(input: {
  guest: PersonalGuestLinkPreparationTarget;
  project: OwnedProject;
}) {
  const guest = assertGuestBelongsToProject(input.guest, input.project.id);
  const token = generatePersonalGuestToken();

  await replacePersonalGuestLinkWithCiphertextForVerifiedGuest({
    guestId: guest.id,
    ...createEncryptedCapability(token),
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

/**
 * Owner-only, explicit re-access. It verifies project ownership and active guest
 * scope before selecting encrypted material, then verifies the decrypted token
 * still matches the persisted SHA-256 authorization hash.
 */
export async function reaccessPersonalGuestLinkForCurrentUser(input: {
  guestId: string;
  projectId: string;
}) {
  const user = await requireCurrentUser();
  const project = await getOwnedProjectById(input.projectId, user.id);
  const guest = assertGuestBelongsToProject(
    await getActiveGuestForVerifiedProjectWithAdmin(project, input.guestId),
    project.id,
  );
  const link = await getActiveRecoverableGuestLinkRecordForVerifiedGuest(guest.id);

  if (!link) {
    throw new GuestLinkUnavailableError();
  }

  if (!link.token_ciphertext || link.token_key_version === null) {
    throw new GuestLinkLegacyUpgradeRequiredError();
  }

  const token = decryptPersonalGuestToken({
    ciphertext: link.token_ciphertext,
    keyVersion: link.token_key_version,
  });

  if (hashPersonalGuestToken(token) !== link.token_hash) {
    throw new GuestLinkUnavailableError();
  }

  return {
    personalUrl: buildPersonalGuestInvitationUrl({ slug: project.slug, token }),
    recipientWhatsAppPhoneE164: guest.whatsapp_phone_e164,
  };
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
  return (
    error instanceof GuestLinkRepositoryError ||
    error instanceof GuestLinkUnavailableError ||
    error instanceof PersonalGuestLinkEncryptionError
  );
}

export { GuestAccessDeniedError, GuestLinkActiveLinkExistsError };
