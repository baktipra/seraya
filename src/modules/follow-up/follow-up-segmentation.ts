import { deriveDeliveryReadiness } from '@/modules/delivery/delivery-readiness';
import type { DeliveryGuestActionRow } from '@/modules/delivery/delivery.types';

import type {
  FollowUpGuestRow,
  GuestFollowUpEligibility,
  GuestFollowUpEvent,
  GuestFollowUpSegment,
  GuestFollowUpSegmentFilter,
  GuestFollowUpSummary,
} from './follow-up.types';

type FollowUpActivityProjection = Pick<
  FollowUpGuestRow,
  'followUpCount' | 'lastFollowUpAt' | 'lastMessageKind'
>;

function createEmptyActivityProjection(): FollowUpActivityProjection {
  return {
    followUpCount: 0,
    lastFollowUpAt: null,
    lastMessageKind: null,
  };
}

function compareFollowUpEvents(left: GuestFollowUpEvent, right: GuestFollowUpEvent) {
  const leftTime = Date.parse(left.occurredAt);
  const rightTime = Date.parse(right.occurredAt);

  if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
    return rightTime - leftTime;
  }

  const occurredAtComparison = right.occurredAt.localeCompare(left.occurredAt);
  return occurredAtComparison !== 0 ? occurredAtComparison : right.id.localeCompare(left.id);
}

/**
 * Groups project-scoped events into the minimum activity projection needed by
 * Slice B. Event metadata and creator IDs never enter the owner-browser DTO.
 */
export function createGuestFollowUpActivityProjections(
  events: readonly GuestFollowUpEvent[],
): ReadonlyMap<string, FollowUpActivityProjection> {
  const eventsByGuest = new Map<string, GuestFollowUpEvent[]>();

  for (const event of events) {
    const guestEvents = eventsByGuest.get(event.guestId) ?? [];
    guestEvents.push(event);
    eventsByGuest.set(event.guestId, guestEvents);
  }

  const projections = new Map<string, FollowUpActivityProjection>();
  for (const [guestId, guestEvents] of eventsByGuest) {
    const latestEvent = [...guestEvents].sort(compareFollowUpEvents)[0];
    projections.set(guestId, {
      followUpCount: guestEvents.length,
      lastFollowUpAt: latestEvent?.occurredAt ?? null,
      lastMessageKind: latestEvent?.messageKind ?? null,
    });
  }

  return projections;
}

/**
 * The order is the governing mutually-exclusive precedence from the locked
 * blueprint. Delivery repair needs outrank RSVP/follow-up state.
 */
export function deriveGuestFollowUpSegment(input: {
  activity: FollowUpActivityProjection;
  row: DeliveryGuestActionRow;
}): GuestFollowUpSegment {
  const readiness = deriveDeliveryReadiness(input.row).deliveryReadinessState;

  if (readiness === 'needs_link_update') return 'needs_link_update';
  if (readiness === 'needs_whatsapp') return 'needs_whatsapp';
  if (readiness === 'no_personal_invitation') return 'no_personal_invitation';
  if (input.row.rsvpStatus !== 'pending') return 'rsvp_responded';
  if (input.activity.followUpCount === 0) return 'no_follow_up_recorded';
  return 'awaiting_rsvp';
}

export function deriveGuestFollowUpEligibility(input: {
  rsvpStatus: DeliveryGuestActionRow['rsvpStatus'];
  segment: GuestFollowUpSegment;
}): GuestFollowUpEligibility {
  return {
    canPrepareEventReminder:
      input.segment === 'rsvp_responded' && input.rsvpStatus === 'attending',
    canPrepareInitialInvitation: input.segment === 'no_follow_up_recorded',
    canPrepareRsvpReminder: input.segment === 'awaiting_rsvp',
  };
}

export function createFollowUpGuestRows(
  deliveryRows: readonly DeliveryGuestActionRow[],
  events: readonly GuestFollowUpEvent[],
): FollowUpGuestRow[] {
  const activityByGuest = createGuestFollowUpActivityProjections(events);

  return deliveryRows.map((row) => {
    const activity = activityByGuest.get(row.guestId) ?? createEmptyActivityProjection();
    const followUpSegment = deriveGuestFollowUpSegment({ activity, row });

    return {
      displayName: row.displayName,
      eligibility: deriveGuestFollowUpEligibility({
        rsvpStatus: row.rsvpStatus,
        segment: followUpSegment,
      }),
      followUpCount: activity.followUpCount,
      followUpSegment,
      groupLabel: row.groupLabel,
      guestId: row.guestId,
      lastFollowUpAt: activity.lastFollowUpAt,
      lastMessageKind: activity.lastMessageKind,
      maskedWhatsAppNumber: row.maskedWhatsAppNumber,
      personalLinkReaccessState: row.personalLinkReaccessState,
      personalLinkState: row.personalLinkState,
      rsvpStatus: row.rsvpStatus,
      whatsappAvailability: row.whatsappAvailability,
    };
  });
}

export function matchesGuestFollowUpSegmentFilter(
  row: Pick<FollowUpGuestRow, 'followUpSegment'>,
  filter: GuestFollowUpSegmentFilter,
) {
  return filter === 'all' || row.followUpSegment === filter;
}

/** Summary and filter surfaces consume the exact same row segment truth. */
export function createGuestFollowUpSummary(
  rows: readonly Pick<FollowUpGuestRow, 'followUpSegment'>[],
): GuestFollowUpSummary {
  const summary = rows.reduce<GuestFollowUpSummary>(
    (current, row) => {
      const segment = row.followUpSegment;
      return {
        activeGuestCount: current.activeGuestCount + 1,
        awaitingRsvpCount: current.awaitingRsvpCount + (segment === 'awaiting_rsvp' ? 1 : 0),
        needsDataRepairCount:
          current.needsDataRepairCount +
          (segment === 'needs_link_update' || segment === 'needs_whatsapp' ? 1 : 0),
        needsLinkUpdateCount:
          current.needsLinkUpdateCount + (segment === 'needs_link_update' ? 1 : 0),
        needsPreparationCount:
          current.needsPreparationCount + (segment === 'no_personal_invitation' ? 1 : 0),
        needsWhatsAppCount:
          current.needsWhatsAppCount + (segment === 'needs_whatsapp' ? 1 : 0),
        noFollowUpRecordedCount:
          current.noFollowUpRecordedCount + (segment === 'no_follow_up_recorded' ? 1 : 0),
        noPersonalInvitationCount:
          current.noPersonalInvitationCount +
          (segment === 'no_personal_invitation' ? 1 : 0),
        rsvpRespondedCount:
          current.rsvpRespondedCount + (segment === 'rsvp_responded' ? 1 : 0),
      };
    },
    {
      activeGuestCount: 0,
      awaitingRsvpCount: 0,
      needsDataRepairCount: 0,
      needsLinkUpdateCount: 0,
      needsPreparationCount: 0,
      needsWhatsAppCount: 0,
      noFollowUpRecordedCount: 0,
      noPersonalInvitationCount: 0,
      rsvpRespondedCount: 0,
    },
  );

  return summary;
}
