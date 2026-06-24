import type { GuestRsvpStatus } from './guest.types';

/** Narrow current-state record used only to calculate owner RSVP summary data. */
export type RsvpAnalyticsGuestRecord = {
  display_name: string;
  rsvp_status: GuestRsvpStatus;
};

/** Deliberately minimal owner-visible pending sample: no IDs, links, or party-size data. */
export type PendingRsvpGuest = {
  displayName: string;
};

/** Current-state RSVP insight only. It does not represent party-size headcount or history. */
export type RsvpAnalyticsViewModel = {
  activeGuestCount: number;
  attendingCount: number;
  declinedCount: number;
  pendingCount: number;
  pendingGuests: PendingRsvpGuest[];
  respondedCount: number;
  respondedPercentage: number;
};
