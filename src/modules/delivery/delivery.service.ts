import 'server-only';

import { requireCurrentUser } from '@/modules/auth/current-user';
import {
  GuestLinkActiveLinkExistsError,
  GuestLinkRepositoryError,
  listLatestGuestLinkStatesForVerifiedGuestIds,
} from '@/modules/guest-links/guest-link.repository';
import {
  createOrReplacePersonalGuestLinkForVerifiedGuest,
  getLatestPersonalGuestLinkStateForVerifiedGuest,
  preparePersonalGuestLinkForVerifiedGuestWithoutReveal,
  replaceNonActivePersonalGuestLinkForVerifiedGuestWithoutReveal,
  reaccessPersonalGuestLinkForCurrentUser,
} from '@/modules/guest-links/guest-link.service';
import { PersonalGuestLinkEncryptionError } from '@/modules/guest-links/guest-link-encryption';
import type { LatestGuestLinkStateRecord } from '@/modules/guest-links/guest-link.types';
import { assertGuestBelongsToProject, GuestAccessDeniedError } from '@/modules/guests/guest.policy';
import { getActiveGuestForVerifiedProjectWithAdmin } from '@/modules/guests/guest.repository';
import { isCanonicalGuestWhatsAppPhoneE164 } from '@/modules/guests/whatsapp-phone';
import { hasCurrentPublishedInvitationForVerifiedProject } from '@/modules/publications/publication.repository';
import { getOwnedProjectById, type OwnedProject } from '@/modules/projects/project.repository';

import { createDeliveryReadinessSummary, deriveDeliveryReadiness } from './delivery-readiness';
import { createDeliveryReadinessXlsx } from './delivery-xlsx';
import {
  DeliveryRepositoryError,
  listActiveDeliveryGuestsForVerifiedProject,
  listDeliveryGuestSelectionEligibilityForVerifiedProject,
  type DeliveryGuestRecord,
} from './delivery.repository';
import type {
  DeliveryBatchPreparationResult,
  DeliveryGuestActionRow,
  DeliveryPersonalLinkState,
  OwnedGuestDeliveryCenter,
} from './delivery.types';

const DELIVERY_BATCH_CONCURRENCY = 8;

export class DeliveryPublicationRequiredError extends Error {
  constructor() {
    super('A published invitation is required before preparing a personal link.');
    this.name = 'DeliveryPublicationRequiredError';
  }
}

export class DeliveryActiveLinkConfirmationRequiredError extends Error {
  constructor() {
    super('Replacing an active personal link requires explicit owner confirmation.');
    this.name = 'DeliveryActiveLinkConfirmationRequiredError';
  }
}

type LatestLinkState = {
  hasRecoverableCapability: boolean;
  state: DeliveryPersonalLinkState;
};

type DeliveryBatchItemFailureClassification =
  | 'encryption_runtime'
  | 'inactive_or_removed'
  | 'persistence_authority'
  | 'persistence_runtime'
  | 'unexpected';

function getLatestLinkStates(records: LatestGuestLinkStateRecord[]) {
  const latestRecords = new Map<string, LatestGuestLinkStateRecord>();

  for (const record of records) {
    const current = latestRecords.get(record.guest_id);
    if (!current || record.created_at > current.created_at) {
      latestRecords.set(record.guest_id, record);
    }
  }

  const latestStates = new Map<string, LatestLinkState>();
  for (const [guestId, record] of latestRecords) {
    latestStates.set(guestId, {
      hasRecoverableCapability: record.hasRecoverableCapability === true,
      state: record.status,
    });
  }

  return latestStates;
}

export function maskDeliveryWhatsAppPhone(phone: string): string {
  const prefixLength = Math.min(3, Math.max(2, phone.length - 4));
  return `${phone.slice(0, prefixLength)}••••${phone.slice(-4)}`;
}

function mapDeliveryGuestRow(
  guest: DeliveryGuestRecord,
  link: LatestLinkState | undefined,
): DeliveryGuestActionRow {
  const personalLinkState = link?.state ?? 'not_created';
  const whatsappPhone = guest.whatsapp_phone_e164;
  const hasValidWhatsApp = isCanonicalGuestWhatsAppPhoneE164(whatsappPhone);

  return {
    displayName: guest.display_name,
    groupLabel: guest.group_label,
    guestId: guest.id,
    maskedWhatsAppNumber:
      hasValidWhatsApp && whatsappPhone ? maskDeliveryWhatsAppPhone(whatsappPhone) : null,
    personalLinkReaccessState:
      personalLinkState !== 'active'
        ? 'unavailable'
        : link?.hasRecoverableCapability
          ? 'recoverable'
          : 'legacy',
    personalLinkState,
    rsvpStatus: guest.rsvp_status,
    whatsappAvailability: hasValidWhatsApp ? 'available' : 'missing',
  };
}

async function getDeliveryGuestsWithLatestStates(project: OwnedProject) {
  const guests = await listActiveDeliveryGuestsForVerifiedProject(project);
  const latestLinkStates = getLatestLinkStates(
    await listLatestGuestLinkStatesForVerifiedGuestIds(guests.map((guest) => guest.id)),
  );
  return { guests, latestLinkStates };
}

/** Private owner delivery data: one guest query, one bounded status batch, one publication check. */
export async function getGuestDeliveryCenterForVerifiedProject(
  project: OwnedProject,
): Promise<OwnedGuestDeliveryCenter> {
  const [{ guests, latestLinkStates }, isPublished] = await Promise.all([
    getDeliveryGuestsWithLatestStates(project),
    hasCurrentPublishedInvitationForVerifiedProject(project),
  ]);
  const rows = guests.map((guest) => mapDeliveryGuestRow(guest, latestLinkStates.get(guest.id)));
  return { isPublished, project, rows, summary: createDeliveryReadinessSummary(rows) };
}

export async function getGuestDeliveryCenterForCurrentUser(
  projectId: string,
): Promise<OwnedGuestDeliveryCenter> {
  const user = await requireCurrentUser();
  const project = await getOwnedProjectById(projectId, user.id);
  return getGuestDeliveryCenterForVerifiedProject(project);
}

/** Delivery-only command gate for explicit create/replacement. */
export async function preparePersonalGuestLinkForDeliveryForCurrentUser(input: {
  confirmActiveReplacement: boolean;
  guestId: string;
  projectId: string;
}) {
  const user = await requireCurrentUser();
  const project = await getOwnedProjectById(input.projectId, user.id);
  const guest = assertGuestBelongsToProject(
    await getActiveGuestForVerifiedProjectWithAdmin(project, input.guestId),
    project.id,
  );
  const isPublished = await hasCurrentPublishedInvitationForVerifiedProject(project);
  if (!isPublished) {
    throw new DeliveryPublicationRequiredError();
  }
  const currentLinkState = await getLatestPersonalGuestLinkStateForVerifiedGuest(guest.id);
  if (currentLinkState === 'active' && !input.confirmActiveReplacement) {
    throw new DeliveryActiveLinkConfirmationRequiredError();
  }
  return createOrReplacePersonalGuestLinkForVerifiedGuest({ guest, project });
}

/** Explicit owner re-access used only by a per-row Delivery Center action. */
export async function reaccessPersonalGuestLinkForDeliveryForCurrentUser(input: {
  guestId: string;
  projectId: string;
}) {
  const user = await requireCurrentUser();
  const project = await getOwnedProjectById(input.projectId, user.id);
  const isPublished = await hasCurrentPublishedInvitationForVerifiedProject(project);
  if (!isPublished) {
    throw new DeliveryPublicationRequiredError();
  }
  // The guest ownership assertion happens again in the link service before decrypt.
  return reaccessPersonalGuestLinkForCurrentUser(input);
}

function classifyBatchItemFailure(error: unknown): DeliveryBatchItemFailureClassification {
  if (error instanceof PersonalGuestLinkEncryptionError) return 'encryption_runtime';
  if (error instanceof GuestLinkRepositoryError) {
    if (error.classification === 'active_guest_unavailable') return 'inactive_or_removed';
    if (error.classification === 'authority_unavailable') return 'persistence_authority';
    return 'persistence_runtime';
  }
  return 'unexpected';
}

function createEmptyBatchResult(requestedGuestCount: number): DeliveryBatchPreparationResult {
  return {
    createdCount: 0,
    failedCount: 0,
    failedEncryptionCount: 0,
    failedUnexpectedCount: 0,
    replacedExpiredLinkCount: 0,
    replacedRevokedLinkCount: 0,
    requestedGuestCount,
    skippedActiveLinkCount: 0,
    skippedInactiveGuestCount: 0,
    skippedInvalidProjectCount: 0,
    whatsappMissingCreatedCount: 0,
  };
}

function logBatchItemFailure(
  classification: DeliveryBatchItemFailureClassification,
  error: unknown,
) {
  console.error('Seraya delivery batch personal-link preparation item failed.', {
    errorClassification: classification,
    errorName: error instanceof Error ? error.name : 'UnknownError',
    operation: 'prepare_personal_link_batch_item',
  });
}

function logBatchSummary(result: DeliveryBatchPreparationResult) {
  if (result.failedCount === 0) return;

  console.error('Seraya delivery batch personal-link preparation completed with failures.', {
    createdCount: result.createdCount,
    failedCount: result.failedCount,
    failedEncryptionCount: result.failedEncryptionCount,
    failedUnexpectedCount: result.failedUnexpectedCount,
    operation: 'prepare_personal_link_batch',
    replacedExpiredLinkCount: result.replacedExpiredLinkCount,
    replacedRevokedLinkCount: result.replacedRevokedLinkCount,
    requestedGuestCount: result.requestedGuestCount,
    skippedActiveLinkCount: result.skippedActiveLinkCount,
    skippedInactiveGuestCount: result.skippedInactiveGuestCount,
    skippedInvalidProjectCount: result.skippedInvalidProjectCount,
  });
}

async function settlePreparationBatch(
  project: OwnedProject,
  guests: Array<{ guest: DeliveryGuestRecord; latestLinkState: DeliveryPersonalLinkState }>,
  initialResult: DeliveryBatchPreparationResult,
): Promise<DeliveryBatchPreparationResult> {
  const result = initialResult;
  let index = 0;

  async function worker() {
    while (index < guests.length) {
      const item = guests[index++];
      if (!item) continue;
      const { guest, latestLinkState } = item;

      try {
        if (latestLinkState === 'revoked' || latestLinkState === 'expired') {
          await replaceNonActivePersonalGuestLinkForVerifiedGuestWithoutReveal({ guest, project });
          if (latestLinkState === 'revoked') result.replacedRevokedLinkCount += 1;
          else result.replacedExpiredLinkCount += 1;
        } else {
          // No previous link: preserve M0018/M0019 create-if-none-active safety.
          await preparePersonalGuestLinkForVerifiedGuestWithoutReveal({ guest, project });
          result.createdCount += 1;
        }
        if (!guest.whatsapp_phone_e164) result.whatsappMissingCreatedCount += 1;
      } catch (error) {
        if (error instanceof GuestLinkActiveLinkExistsError) {
          result.skippedActiveLinkCount += 1;
          continue;
        }

        const classification = classifyBatchItemFailure(error);
        if (classification === 'inactive_or_removed') {
          result.skippedInactiveGuestCount += 1;
        } else if (classification === 'encryption_runtime') {
          result.failedEncryptionCount += 1;
          result.failedCount += 1;
          logBatchItemFailure(classification, error);
        } else {
          result.failedUnexpectedCount += 1;
          result.failedCount += 1;
          logBatchItemFailure(classification, error);
        }
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(DELIVERY_BATCH_CONCURRENCY, guests.length) }, worker),
  );

  return result;
}

/**
 * Batch authority accepts a required, exact visible-selection list. It never
 * expands a missing client selection into every project guest. The server
 * re-intersects that list with the verified owner project before any mutation.
 */
export async function prepareMissingPersonalGuestLinksForDeliveryForCurrentUser(input: {
  guestIds: string[];
  projectId: string;
}) {
  const user = await requireCurrentUser();
  const project = await getOwnedProjectById(input.projectId, user.id);
  const isPublished = await hasCurrentPublishedInvitationForVerifiedProject(project);
  if (!isPublished) throw new DeliveryPublicationRequiredError();

  const requestedGuestIds = [...new Set(input.guestIds)];
  const [{ guests, latestLinkStates }, selectedProjectRecords] = await Promise.all([
    getDeliveryGuestsWithLatestStates(project),
    listDeliveryGuestSelectionEligibilityForVerifiedProject(project, requestedGuestIds),
  ]);
  const activeGuestsById = new Map(guests.map((guest) => [guest.id, guest]));
  const selectedProjectRecordsById = new Map(
    selectedProjectRecords.map((guest) => [guest.id, guest]),
  );
  const result = createEmptyBatchResult(requestedGuestIds.length);
  const eligibleGuests: Array<{
    guest: DeliveryGuestRecord;
    latestLinkState: DeliveryPersonalLinkState;
  }> = [];

  for (const guestId of requestedGuestIds) {
    const activeGuest = activeGuestsById.get(guestId);
    if (!activeGuest) {
      const selectedProjectRecord = selectedProjectRecordsById.get(guestId);
      if (selectedProjectRecord?.deleted_at) {
        result.skippedInactiveGuestCount += 1;
      } else {
        // Missing rows and other-project IDs are deliberately merged so the
        // response cannot reveal another project's guest existence.
        result.skippedInvalidProjectCount += 1;
      }
      continue;
    }

    const state = latestLinkStates.get(activeGuest.id)?.state ?? 'not_created';
    if (state === 'active') {
      result.skippedActiveLinkCount += 1;
      continue;
    }

    eligibleGuests.push({ guest: activeGuest, latestLinkState: state });
  }

  const settled = await settlePreparationBatch(project, eligibleGuests, result);
  logBatchSummary(settled);
  return settled;
}

/** Owner-only numbers for a local clipboard action. It does not send or open WhatsApp. */
/** Owner-only XLSX delivery export, intersected with the verified project delivery list. */
export async function getDeliveryReadinessXlsxForCurrentUser(input: {
  guestIds: string[];
  projectId: string;
}): Promise<Uint8Array> {
  const user = await requireCurrentUser();
  const project = await getOwnedProjectById(input.projectId, user.id);
  const { guests, latestLinkStates } = await getDeliveryGuestsWithLatestStates(project);
  const selected = new Set(input.guestIds);
  const exportGuests =
    input.guestIds.length === 0 ? guests : guests.filter((guest) => selected.has(guest.id));
  const rows = exportGuests.map((guest) => {
    const row = mapDeliveryGuestRow(guest, latestLinkStates.get(guest.id));
    return {
      ...row,
      whatsappPhoneE164: guest.whatsapp_phone_e164,
    };
  });
  return createDeliveryReadinessXlsx(rows);
}

export async function getSelectedDeliveryWhatsAppNumbersForCurrentUser(input: {
  guestIds: string[];
  projectId: string;
}) {
  const user = await requireCurrentUser();
  const project = await getOwnedProjectById(input.projectId, user.id);
  const selected = new Set(input.guestIds);
  const { guests, latestLinkStates } = await getDeliveryGuestsWithLatestStates(project);
  return guests.flatMap((guest) => {
    if (!selected.has(guest.id)) return [];
    const row = mapDeliveryGuestRow(guest, latestLinkStates.get(guest.id));
    const readiness = deriveDeliveryReadiness(row);
    return readiness.isReadyToDistribute && guest.whatsapp_phone_e164
      ? [guest.whatsapp_phone_e164]
      : [];
  });
}

export function isDeliveryFailure(error: unknown) {
  return error instanceof DeliveryRepositoryError;
}

export { GuestAccessDeniedError };
