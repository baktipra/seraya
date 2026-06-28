import 'server-only';

import { requireCurrentUser } from '@/modules/auth/current-user';
import {
  createOrReplacePersonalGuestLinkForVerifiedGuest,
  GuestLinkActiveLinkExistsError,
  reaccessPersonalGuestLinkForCurrentUser,
  getLatestPersonalGuestLinkStateForVerifiedGuest,
  preparePersonalGuestLinkForVerifiedGuestWithoutReveal,
} from '@/modules/guest-links/guest-link.service';
import { listLatestGuestLinkStatesForVerifiedGuestIds } from '@/modules/guest-links/guest-link.repository';
import type { LatestGuestLinkStateRecord } from '@/modules/guest-links/guest-link.types';
import { assertGuestBelongsToProject, GuestAccessDeniedError } from '@/modules/guests/guest.policy';
import { getActiveGuestForVerifiedProjectWithAdmin } from '@/modules/guests/guest.repository';
import { hasCurrentPublishedInvitationForVerifiedProject } from '@/modules/publications/publication.repository';

import { createDeliveryReadinessXlsx } from './delivery-xlsx';
import { getOwnedProjectById, type OwnedProject } from '@/modules/projects/project.repository';

import {
  listActiveDeliveryGuestsForVerifiedProject,
  type DeliveryGuestRecord,
  DeliveryRepositoryError,
} from './delivery.repository';
import type {
  DeliveryBatchPreparationResult,
  DeliveryGuestActionRow,
  DeliveryGuestRow,
  DeliveryPersonalLinkState,
  DeliveryReadinessSummary,
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

function hasActivePersonalLink(state: DeliveryPersonalLinkState) {
  return state === 'active';
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

  return {
    displayName: guest.display_name,
    groupLabel: guest.group_label,
    guestId: guest.id,
    maskedWhatsAppNumber: whatsappPhone ? maskDeliveryWhatsAppPhone(whatsappPhone) : null,
    personalLinkReaccessState:
      personalLinkState !== 'active'
        ? 'unavailable'
        : link?.hasRecoverableCapability
          ? 'recoverable'
          : 'legacy',
    personalLinkState,
    rsvpStatus: guest.rsvp_status,
    whatsappAvailability: whatsappPhone ? 'available' : 'missing',
  };
}

function createReadinessSummary(rows: DeliveryGuestRow[]): DeliveryReadinessSummary {
  return rows.reduce<DeliveryReadinessSummary>(
    (summary, row) => {
      const readyToShare = hasActivePersonalLink(row.personalLinkState);
      return {
        activeGuestCount: summary.activeGuestCount + 1,
        activePersonalLinkCount: summary.activePersonalLinkCount + (readyToShare ? 1 : 0),
        guestsWithoutActivePersonalLinkCount:
          summary.guestsWithoutActivePersonalLinkCount + (readyToShare ? 0 : 1),
        whatsappAvailableCount:
          summary.whatsappAvailableCount + (row.whatsappAvailability === 'available' ? 1 : 0),
        whatsappMissingCount:
          summary.whatsappMissingCount + (row.whatsappAvailability === 'missing' ? 1 : 0),
      };
    },
    {
      activeGuestCount: 0,
      activePersonalLinkCount: 0,
      guestsWithoutActivePersonalLinkCount: 0,
      whatsappAvailableCount: 0,
      whatsappMissingCount: 0,
    },
  );
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
  return { isPublished, project, rows, summary: createReadinessSummary(rows) };
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

async function settlePreparationBatch(
  project: OwnedProject,
  guests: DeliveryGuestRecord[],
): Promise<DeliveryBatchPreparationResult> {
  let createdCount = 0;
  let failedCount = 0;
  let skippedActiveLinkCount = 0;
  let whatsappMissingCreatedCount = 0;
  let index = 0;

  async function worker() {
    while (index < guests.length) {
      const guest = guests[index++];
      if (!guest) continue;
      try {
        await preparePersonalGuestLinkForVerifiedGuestWithoutReveal({ guest, project });
        createdCount += 1;
        if (!guest.whatsapp_phone_e164) whatsappMissingCreatedCount += 1;
      } catch (error) {
        if (error instanceof GuestLinkActiveLinkExistsError) {
          skippedActiveLinkCount += 1;
        } else {
          failedCount += 1;
          console.error('Seraya delivery batch personal-link preparation item failed.', {
            errorName: error instanceof Error ? error.name : 'UnknownError',
          });
        }
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(DELIVERY_BATCH_CONCURRENCY, guests.length) }, worker),
  );
  return { createdCount, failedCount, skippedActiveLinkCount, whatsappMissingCreatedCount };
}

/** Batch authority returns aggregate-only results and never reveals capability material. */
export async function prepareMissingPersonalGuestLinksForDeliveryForCurrentUser(input: {
  guestIds?: string[];
  projectId: string;
}) {
  const user = await requireCurrentUser();
  const project = await getOwnedProjectById(input.projectId, user.id);
  const isPublished = await hasCurrentPublishedInvitationForVerifiedProject(project);
  if (!isPublished) throw new DeliveryPublicationRequiredError();

  const { guests, latestLinkStates } = await getDeliveryGuestsWithLatestStates(project);
  const selected = input.guestIds ? new Set(input.guestIds) : null;
  const eligibleGuests = guests.filter((guest) => {
    const state = latestLinkStates.get(guest.id)?.state ?? 'not_created';
    return state !== 'active' && (!selected || selected.has(guest.id));
  });
  const skippedActiveLinkCount = guests.filter((guest) => {
    const state = latestLinkStates.get(guest.id)?.state ?? 'not_created';
    return state === 'active' && (!selected || selected.has(guest.id));
  }).length;

  const result = await settlePreparationBatch(project, eligibleGuests);
  return {
    ...result,
    skippedActiveLinkCount: result.skippedActiveLinkCount + skippedActiveLinkCount,
  };
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
  const guests = await listActiveDeliveryGuestsForVerifiedProject(project);
  return guests
    .filter((guest) => selected.has(guest.id))
    .flatMap((guest) => (guest.whatsapp_phone_e164 ? [guest.whatsapp_phone_e164] : []));
}

export function isDeliveryFailure(error: unknown) {
  return error instanceof DeliveryRepositoryError;
}

export { GuestAccessDeniedError };
