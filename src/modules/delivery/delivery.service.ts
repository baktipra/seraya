import 'server-only';

import { requireCurrentUser } from '@/modules/auth/current-user';
import {
  createOrReplacePersonalGuestLinkForVerifiedGuest,
  getLatestPersonalGuestLinkStateForVerifiedGuest,
  GuestLinkActiveLinkExistsError,
  preparePersonalGuestLinkForVerifiedGuestWithoutReveal,
} from '@/modules/guest-links/guest-link.service';
import { listLatestGuestLinkStatesForVerifiedGuestIds } from '@/modules/guest-links/guest-link.repository';
import type { LatestGuestLinkStateRecord } from '@/modules/guest-links/guest-link.types';
import { assertGuestBelongsToProject, GuestAccessDeniedError } from '@/modules/guests/guest.policy';
import { getActiveGuestForVerifiedProjectWithAdmin } from '@/modules/guests/guest.repository';
import { hasCurrentPublishedInvitationForVerifiedProject } from '@/modules/publications/publication.repository';
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

function getLatestLinkStates(records: LatestGuestLinkStateRecord[]) {
  const latestRecords = new Map<string, LatestGuestLinkStateRecord>();

  for (const record of records) {
    const current = latestRecords.get(record.guest_id);

    if (!current || record.created_at > current.created_at) {
      latestRecords.set(record.guest_id, record);
    }
  }

  const latestStates = new Map<string, DeliveryPersonalLinkState>();

  for (const [guestId, record] of latestRecords) {
    latestStates.set(guestId, record.status);
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
  personalLinkState: DeliveryPersonalLinkState,
): DeliveryGuestActionRow {
  const whatsappPhone = guest.whatsapp_phone_e164;

  return {
    displayName: guest.display_name,
    groupLabel: guest.group_label,
    guestId: guest.id,
    maskedWhatsAppNumber: whatsappPhone ? maskDeliveryWhatsAppPhone(whatsappPhone) : null,
    personalLinkState,
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

/**
 * Private owner delivery data. It is intentionally one guest query, one
 * bounded link-state batch, and one narrow current-publication existence check.
 */
export async function getGuestDeliveryCenterForVerifiedProject(
  project: OwnedProject,
): Promise<OwnedGuestDeliveryCenter> {
  const [{ guests, latestLinkStates }, isPublished] = await Promise.all([
    getDeliveryGuestsWithLatestStates(project),
    hasCurrentPublishedInvitationForVerifiedProject(project),
  ]);

  const rows = guests.map((guest) =>
    mapDeliveryGuestRow(guest, latestLinkStates.get(guest.id) ?? 'not_created'),
  );

  return {
    isPublished,
    project,
    rows,
    summary: createReadinessSummary(rows),
  };
}

/** Standalone owner-scoped delivery loader for non-RSC callers. */
export async function getGuestDeliveryCenterForCurrentUser(
  projectId: string,
): Promise<OwnedGuestDeliveryCenter> {
  const user = await requireCurrentUser();
  const project = await getOwnedProjectById(projectId, user.id);
  return getGuestDeliveryCenterForVerifiedProject(project);
}

/**
 * Delivery-only command gate. The existing low-level personal-link authority is
 * reused after owner, guest, current publication, and active-link confirmation
 * checks have all completed server-side.
 */
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

async function settlePreparationBatch(
  project: OwnedProject,
  guests: DeliveryGuestRecord[],
): Promise<{
  createdCount: number;
  failedCount: number;
  skippedActiveLinkCount: number;
  whatsappMissingCreatedCount: number;
}> {
  let nextIndex = 0;
  let createdCount = 0;
  let failedCount = 0;
  let skippedActiveLinkCount = 0;
  let whatsappMissingCreatedCount = 0;

  async function worker() {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      const guest = guests[currentIndex];

      if (!guest) {
        return;
      }

      try {
        await preparePersonalGuestLinkForVerifiedGuestWithoutReveal({ guest, project });
        createdCount += 1;

        if (!guest.whatsapp_phone_e164) {
          whatsappMissingCreatedCount += 1;
        }
      } catch (error) {
        if (error instanceof GuestLinkActiveLinkExistsError) {
          skippedActiveLinkCount += 1;
          continue;
        }

        failedCount += 1;
        console.error('Seraya delivery batch personal-link preparation item failed.', {
          errorName: error instanceof Error ? error.name : 'UnknownError',
        });
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(DELIVERY_BATCH_CONCURRENCY, guests.length) }, () => worker()),
  );

  return { createdCount, failedCount, skippedActiveLinkCount, whatsappMissingCreatedCount };
}

/**
 * Creates active personal-link state only for owner-scoped active guests that
 * did not have an active link in the bounded status projection. It intentionally
 * discards every raw token/URL; manual sharing remains a per-guest one-time
 * flow through the existing Delivery Center action.
 */
export async function prepareMissingPersonalGuestLinksForDeliveryForCurrentUser(input: {
  projectId: string;
}): Promise<DeliveryBatchPreparationResult> {
  const user = await requireCurrentUser();
  const project = await getOwnedProjectById(input.projectId, user.id);
  const [isPublished, { guests, latestLinkStates }] = await Promise.all([
    hasCurrentPublishedInvitationForVerifiedProject(project),
    getDeliveryGuestsWithLatestStates(project),
  ]);

  if (!isPublished) {
    throw new DeliveryPublicationRequiredError();
  }

  const guestsWithActiveLinks = guests.filter(
    (guest) => (latestLinkStates.get(guest.id) ?? 'not_created') === 'active',
  );
  const eligibleGuests = guests.filter(
    (guest) => (latestLinkStates.get(guest.id) ?? 'not_created') !== 'active',
  );

  const result = await settlePreparationBatch(project, eligibleGuests);

  return {
    ...result,
    skippedActiveLinkCount: guestsWithActiveLinks.length + result.skippedActiveLinkCount,
  };
}

export function isDeliveryFailure(error: unknown) {
  return error instanceof DeliveryRepositoryError;
}

export { GuestAccessDeniedError };
