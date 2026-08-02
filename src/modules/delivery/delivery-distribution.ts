import { deriveDeliveryReadiness } from './delivery-readiness';
import type {
  DeliveryDistributionDerivation,
  DeliveryDistributionFilter,
  DeliveryDistributionState,
  DeliveryGuestActionRow,
  DeliveryGuestRow,
  DeliveryHandoffSummary,
} from './delivery.types';

type DeliveryDistributionSubject = Pick<
  DeliveryGuestRow,
  | 'contactRecordedAt'
  | 'initialHandoffPreparedAt'
  | 'personalLinkLifecycleState'
  | 'personalLinkReaccessState'
  | 'personalLinkState'
  | 'rsvpStatus'
  | 'whatsappAvailability'
>;

type InitialHandoffActivityEvent = {
  eventType: string;
  guestId: string;
  messageKind: string;
  occurredAt: string;
};

const distributionLabels: Record<DeliveryDistributionState, string> = {
  contact_recorded: 'Ditandai sudah dihubungi',
  handoff_prepared: 'Pembagian disiapkan',
  needs_link_update: 'Tautan perlu diperbarui',
  needs_whatsapp: 'Butuh nomor WhatsApp',
  no_personal_invitation: 'Belum punya Undangan Pribadi',
  ready_for_handoff: 'Siap dibagikan',
};

const nextStepLabels: Record<DeliveryDistributionState, string> = {
  contact_recorded: 'Pantau respons tamu',
  handoff_prepared: 'Lanjutkan pembagian atau tandai sudah dihubungi',
  needs_link_update: 'Kelola tautan di Tamu',
  needs_whatsapp: 'Lengkapi nomor WhatsApp di Tamu',
  no_personal_invitation: 'Siapkan Undangan Pribadi',
  ready_for_handoff: 'Siapkan pembagian WhatsApp manual',
};

function latestTimestamp(current: string | null, candidate: string) {
  if (!current) return candidate;
  const currentTime = Date.parse(current);
  const candidateTime = Date.parse(candidate);
  if (Number.isFinite(currentTime) && Number.isFinite(candidateTime)) {
    return candidateTime > currentTime ? candidate : current;
  }
  return candidate > current ? candidate : current;
}

/**
 * Projects only initial-invitation owner activity. Message bodies, creator IDs,
 * and channel receipts never enter the delivery list DTO.
 */
export function projectInitialHandoffTruth(
  rows: readonly DeliveryGuestActionRow[],
  events: readonly InitialHandoffActivityEvent[],
): DeliveryGuestActionRow[] {
  const activityByGuest = new Map<
    string,
    { contactRecordedAt: string | null; initialHandoffPreparedAt: string | null }
  >();

  for (const event of events) {
    if (event.messageKind !== 'initial_invitation') continue;
    if (
      event.eventType !== 'handoff_prepared' &&
      event.eventType !== 'manual_contact_recorded'
    ) {
      continue;
    }

    const current = activityByGuest.get(event.guestId) ?? {
      contactRecordedAt: null,
      initialHandoffPreparedAt: null,
    };

    if (event.eventType === 'handoff_prepared') {
      current.initialHandoffPreparedAt = latestTimestamp(
        current.initialHandoffPreparedAt,
        event.occurredAt,
      );
    } else {
      current.contactRecordedAt = latestTimestamp(
        current.contactRecordedAt,
        event.occurredAt,
      );
    }
    activityByGuest.set(event.guestId, current);
  }

  return rows.map((row) => ({
    ...row,
    ...(activityByGuest.get(row.guestId) ?? {
      contactRecordedAt: null,
      initialHandoffPreparedAt: null,
    }),
  }));
}

/**
 * Current link/contact safety outranks historical activity. Therefore a legacy,
 * revoked, expired, or contact-missing row returns to a repair state even when
 * the owner previously prepared a handoff.
 */
export function deriveDeliveryDistribution(
  row: DeliveryDistributionSubject,
): DeliveryDistributionDerivation {
  const readiness = deriveDeliveryReadiness(row);
  const initialHandoffPreparedAt = row.initialHandoffPreparedAt ?? null;
  const contactRecordedAt = row.contactRecordedAt ?? null;

  let distributionState: DeliveryDistributionState;
  if (readiness.deliveryReadinessState !== 'ready_to_distribute') {
    distributionState = readiness.deliveryReadinessState;
  } else if (contactRecordedAt) {
    distributionState = 'contact_recorded';
  } else if (initialHandoffPreparedAt) {
    distributionState = 'handoff_prepared';
  } else {
    distributionState = 'ready_for_handoff';
  }

  const isAwaitingRsvp =
    row.rsvpStatus === 'pending' &&
    (distributionState === 'handoff_prepared' || distributionState === 'contact_recorded');

  return {
    canRecordContact: distributionState === 'handoff_prepared',
    contactRecordedAt: distributionState === 'contact_recorded' ? contactRecordedAt : null,
    distributionLabel: distributionLabels[distributionState],
    distributionState,
    initialHandoffPreparedAt:
      distributionState === 'handoff_prepared' || distributionState === 'contact_recorded'
        ? initialHandoffPreparedAt
        : null,
    isAwaitingRsvp,
    isContactRecorded: distributionState === 'contact_recorded',
    isInitialHandoffPrepared:
      distributionState === 'handoff_prepared' || distributionState === 'contact_recorded',
    isReadyForInitialHandoff: distributionState === 'ready_for_handoff',
    nextStepLabel: nextStepLabels[distributionState],
    shareActionLabel:
      distributionState === 'ready_for_handoff' ? 'Siapkan pembagian' : 'Buka WhatsApp lagi',
  };
}

function isNotReadyState(state: DeliveryDistributionState) {
  return (
    state === 'needs_link_update' ||
    state === 'needs_whatsapp' ||
    state === 'no_personal_invitation'
  );
}

export function matchesDeliveryDistributionFilter(
  row: DeliveryDistributionSubject,
  filter: DeliveryDistributionFilter,
) {
  const truth = deriveDeliveryDistribution(row);
  if (filter === 'all') return true;
  if (filter === 'not_ready') return isNotReadyState(truth.distributionState);
  if (filter === 'awaiting_rsvp') return truth.isAwaitingRsvp;
  return truth.distributionState === filter;
}

export function createDeliveryHandoffSummary(
  rows: readonly DeliveryDistributionSubject[],
): DeliveryHandoffSummary {
  return rows.reduce<DeliveryHandoffSummary>(
    (summary, row) => {
      const truth = deriveDeliveryDistribution(row);
      return {
        awaitingRsvpCount: summary.awaitingRsvpCount + (truth.isAwaitingRsvp ? 1 : 0),
        contactRecordedCount:
          summary.contactRecordedCount + (truth.isContactRecorded ? 1 : 0),
        handoffPreparedCount:
          summary.handoffPreparedCount +
          (truth.distributionState === 'handoff_prepared' ? 1 : 0),
        readyForHandoffCount:
          summary.readyForHandoffCount +
          (truth.distributionState === 'ready_for_handoff' ? 1 : 0),
      };
    },
    {
      awaitingRsvpCount: 0,
      contactRecordedCount: 0,
      handoffPreparedCount: 0,
      readyForHandoffCount: 0,
    },
  );
}
