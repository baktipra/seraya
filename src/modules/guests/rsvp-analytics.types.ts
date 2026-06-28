import type { GuestRsvpStatus } from './guest.types';

/** Narrow active-guest record used only to calculate owner RSVP current state. */
export type RsvpAnalyticsGuestRecord = {
  display_name: string;
  group_label: string | null;
  id: string;
  party_size: number;
  rsvp_attendee_count: number | null;
  rsvp_status: GuestRsvpStatus;
  updated_at: string;
};

/** Deliberately minimal owner-visible pending sample: no links or party-size data. */
export type PendingRsvpGuest = {
  displayName: string;
};

/** Owner-only response row. No capability, contact, or guestbook message enters this view model. */
export type RsvpResponseRow = {
  displayName: string;
  groupLabel: string | null;
  guestId: string;
  partySize: number;
  rsvpAttendeeCount: number | null;
  rsvpStatus: GuestRsvpStatus;
  updatedAt: string;
};

/**
 * Current RSVP state only. Guest-group metrics and explicit attendee headcount
 * are intentionally separate: unknown legacy attendance never inflates totals.
 */
export type RsvpAnalyticsViewModel = {
  activeGuestCount: number;
  attendingCountUnknownGuestCount: number;
  attendingGuestCount: number;
  confirmedAttendeeCount: number;
  declinedGuestCount: number;
  invitedPeopleCount: number;
  pendingGuestCount: number;
  pendingGuests: PendingRsvpGuest[];
  respondedCount: number;
  respondedPercentage: number;
  responseRows: RsvpResponseRow[];
};
