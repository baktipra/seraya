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
import { deriveGuestLinkLifecycleFromLatestRecord } from './guest-link-lifecycle';
import { buildPersonalGuestInvitationUrl } from './guest-link-url';
import type {
  GuestLinkLifecycleDerivation,
  GuestLinkLifecycleState,
  GuestPersonalLinkCurrentState,
} from './guest-link.types';
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

/** The browser acted on a lifecycle snapshot that is no longer current. */
export class GuestLinkLifecycleChangedError extends Error {
  constructor() {
    super('The personal guest-link lifecycle changed before the command completed.');
    this.name = 'GuestLinkLifecycleChangedError';
  }
}

/** Destructive replacement of an active capability always requires an explicit confirmation. */
export class GuestLinkActiveReplacementConfirmationRequiredError extends Error {
  constructor() {
    super('Replacing an active personal guest link requires explicit confirmation.');
    this.name = 'GuestLinkActiveReplacementConfirmationRequiredError';
  }
}

/** Revocation is accepted only from the explicit owner confirmation surface. */
export class GuestLinkRevocationConfirmationRequiredError extends Error {
  constructor() {
    super('Revoking an active personal guest link requires explicit confirmation.');
    this.name = 'GuestLinkRevocationConfirmationRequiredError';
  }
}

/** The requested command is not valid for the latest canonical lifecycle. */
export class GuestLinkCommandNotAllowedError extends Error {
  constructor() {
    super('The requested personal guest-link command is not allowed for the latest lifecycle.');
    this.name = 'GuestLinkCommandNotAllowedError';
  }
}

/** Minimum server-only guest shape required by the existing link authority. */
export type PersonalGuestLinkPreparationTarget = Pick<
  Guest,
  'deleted_at' | 'id' | 'project_id' | 'whatsapp_phone_e164'
>;

type VerifiedOwnerGuestTarget = {
  guest: PersonalGuestLinkPreparationTarget;
  project: OwnedProject;
};

function createEncryptedCapability(token: string) {
  const encrypted = encryptPersonalGuestToken(token);

  return {
    tokenCiphertext: encrypted.ciphertext,
    tokenHash: hashPersonalGuestToken(token),
    tokenKeyVersion: encrypted.keyVersion,
  };
}

async function getVerifiedOwnerGuestTarget(input: {
  guestId: string;
  projectId: string;
}): Promise<VerifiedOwnerGuestTarget> {
  const user = await requireCurrentUser();
  const project = await getOwnedProjectById(input.projectId, user.id);
  const guest = assertGuestBelongsToProject(
    await getActiveGuestForVerifiedProjectWithAdmin(project, input.guestId),
    project.id,
  );

  return { guest, project };
}

async function getLatestPersonalGuestLinkLifecycleForVerifiedGuest(
  guestId: string,
): Promise<GuestLinkLifecycleDerivation> {
  const records = await listLatestGuestLinkStatesForVerifiedGuestIds([guestId]);
  return deriveGuestLinkLifecycleFromLatestRecord(records[0]);
}

function assertExpectedLifecycle(
  lifecycle: GuestLinkLifecycleDerivation,
  expectedLifecycleState: GuestLinkLifecycleState,
) {
  if (lifecycle.lifecycleState !== expectedLifecycleState) {
    throw new GuestLinkLifecycleChangedError();
  }
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
 * Batch lifecycle replacement for a selected guest whose latest link is
 * revoked/expired. It uses the exact encrypted capability authority as the
 * explicit single-link flow but never reveals raw capability material.
 */
export async function replaceNonActivePersonalGuestLinkForVerifiedGuestWithoutReveal(input: {
  guest: PersonalGuestLinkPreparationTarget;
  project: OwnedProject;
}): Promise<void> {
  const guest = assertGuestBelongsToProject(input.guest, input.project.id);
  const token = generatePersonalGuestToken();

  await replacePersonalGuestLinkWithCiphertextForVerifiedGuest({
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

/**
 * Generates raw capability material only after owner + active guest checks pass.
 * The expected lifecycle and explicit active-replacement confirmation prevent a
 * stale browser row from silently replacing a newer active capability.
 */
export async function createOrReplacePersonalGuestLinkForCurrentUser(input: {
  /** Optional only for existing server-internal callers; owner actions always provide it. */
  confirmActiveReplacement?: boolean;
  /** Optional only for existing server-internal callers; owner actions always provide it. */
  expectedLifecycleState?: GuestLinkLifecycleState;
  guestId: string;
  projectId: string;
}) {
  const { guest, project } = await getVerifiedOwnerGuestTarget(input);
  const lifecycle = await getLatestPersonalGuestLinkLifecycleForVerifiedGuest(guest.id);

  if (input.expectedLifecycleState) {
    assertExpectedLifecycle(lifecycle, input.expectedLifecycleState);

    if (lifecycle.requiresReplacementConfirmation && !input.confirmActiveReplacement) {
      throw new GuestLinkActiveReplacementConfirmationRequiredError();
    }
  }

  if (!lifecycle.canCreate && !lifecycle.canReplace) {
    throw new GuestLinkCommandNotAllowedError();
  }

  const result = await createOrReplacePersonalGuestLinkForVerifiedGuest({ guest, project });
  return { ...result, previousLifecycleState: lifecycle.lifecycleState };
}

/**
 * Re-accesses capability material only after an upstream service has already
 * verified the owner project and active guest. Hash verification remains here
 * so every caller uses the exact same encrypted-link authority.
 */
export async function reaccessPersonalGuestLinkForVerifiedGuest(input: {
  guest: PersonalGuestLinkPreparationTarget;
  project: OwnedProject;
}) {
  const guest = assertGuestBelongsToProject(input.guest, input.project.id);
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
    personalUrl: buildPersonalGuestInvitationUrl({ slug: input.project.slug, token }),
    recipientWhatsAppPhoneE164: guest.whatsapp_phone_e164,
  };
}

/**
 * Owner-only, explicit re-access. The lifecycle snapshot is checked before any
 * encrypted capability material is selected or decrypted.
 */
export async function reaccessPersonalGuestLinkForCurrentUser(input: {
  expectedLifecycleState?: 'active_recoverable';
  guestId: string;
  projectId: string;
}) {
  const { guest, project } = await getVerifiedOwnerGuestTarget(input);

  if (input.expectedLifecycleState) {
    const lifecycle = await getLatestPersonalGuestLinkLifecycleForVerifiedGuest(guest.id);
    assertExpectedLifecycle(lifecycle, input.expectedLifecycleState);

    if (!lifecycle.canReaccess) {
      throw new GuestLinkCommandNotAllowedError();
    }
  }

  return reaccessPersonalGuestLinkForVerifiedGuest({ guest, project });
}

/** Owner-only status check for Delivery Center replacement confirmation. */
export async function getLatestPersonalGuestLinkStateForVerifiedGuest(
  guestId: string,
): Promise<GuestPersonalLinkCurrentState> {
  const lifecycle = await getLatestPersonalGuestLinkLifecycleForVerifiedGuest(guestId);
  return lifecycle.currentState;
}

/**
 * Owner-only revocation. It is accepted only from an explicitly confirmed
 * active lifecycle and the database function atomically targets active state.
 */
export async function revokePersonalGuestLinkForCurrentUser(input: {
  confirmRevocation?: boolean;
  expectedLifecycleState?: 'active_recoverable' | 'active_legacy';
  guestId: string;
  projectId: string;
}) {
  const { guest } = await getVerifiedOwnerGuestTarget(input);

  if (input.expectedLifecycleState) {
    const lifecycle = await getLatestPersonalGuestLinkLifecycleForVerifiedGuest(guest.id);
    assertExpectedLifecycle(lifecycle, input.expectedLifecycleState);

    if (!lifecycle.canRevoke) {
      throw new GuestLinkCommandNotAllowedError();
    }

    if (!input.confirmRevocation) {
      throw new GuestLinkRevocationConfirmationRequiredError();
    }
  }

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
