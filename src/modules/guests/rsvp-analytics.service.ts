import 'server-only';

import { requireCurrentUser } from '@/modules/auth/current-user';
import { getOwnedProjectById, type OwnedProject } from '@/modules/projects/project.repository';

import { listRsvpAnalyticsGuestsForVerifiedProject } from './rsvp-analytics.repository';
import type { RsvpAnalyticsGuestRecord, RsvpAnalyticsViewModel } from './rsvp-analytics.types';

const PENDING_GUEST_SAMPLE_LIMIT = 5;

export type OwnedRsvpAnalytics = {
  analytics: RsvpAnalyticsViewModel;
  project: OwnedProject;
};

/**
 * Calculates active guest-group response state and explicit submitted attendee
 * counts. party_size remains an invitation cap, never an inferred attendance.
 */
export function createRsvpAnalyticsViewModel(
  guests: RsvpAnalyticsGuestRecord[],
): RsvpAnalyticsViewModel {
  let attendingGuestCount = 0;
  let attendingCountUnknownGuestCount = 0;
  let confirmedAttendeeCount = 0;
  let declinedGuestCount = 0;
  let invitedPeopleCount = 0;
  let pendingGuestCount = 0;
  const pendingGuests: RsvpAnalyticsViewModel['pendingGuests'] = [];

  for (const guest of guests) {
    invitedPeopleCount += guest.party_size;

    if (guest.rsvp_status === 'attending') {
      attendingGuestCount += 1;

      if (guest.rsvp_attendee_count === null) {
        attendingCountUnknownGuestCount += 1;
      } else {
        confirmedAttendeeCount += guest.rsvp_attendee_count;
      }
      continue;
    }

    if (guest.rsvp_status === 'declined') {
      declinedGuestCount += 1;
      continue;
    }

    pendingGuestCount += 1;

    if (pendingGuests.length < PENDING_GUEST_SAMPLE_LIMIT) {
      pendingGuests.push({ displayName: guest.display_name });
    }
  }

  const activeGuestCount = guests.length;
  const respondedCount = attendingGuestCount + declinedGuestCount;
  const respondedPercentage =
    activeGuestCount === 0 ? 0 : Math.round((respondedCount / activeGuestCount) * 100);

  return {
    activeGuestCount,
    attendingCountUnknownGuestCount,
    attendingGuestCount,
    confirmedAttendeeCount,
    declinedGuestCount,
    invitedPeopleCount,
    pendingGuestCount,
    pendingGuests,
    respondedCount,
    respondedPercentage,
  };
}

/** Read-only current-state analytics after verified server project scope. */
export async function getRsvpAnalyticsForVerifiedProject(
  project: OwnedProject,
): Promise<OwnedRsvpAnalytics> {
  const guests = await listRsvpAnalyticsGuestsForVerifiedProject(project);

  return {
    analytics: createRsvpAnalyticsViewModel(guests),
    project,
  };
}

/** Standalone owner-scoped read path. Project verification precedes the narrow guest query. */
export async function getRsvpAnalyticsForCurrentUser(
  projectId: string,
): Promise<OwnedRsvpAnalytics> {
  const user = await requireCurrentUser();
  const project = await getOwnedProjectById(projectId, user.id);

  return getRsvpAnalyticsForVerifiedProject(project);
}
