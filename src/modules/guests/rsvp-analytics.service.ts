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
 * Calculates current guest-record status only. No response timeline, party-size
 * weighting, link metadata, or updated_at interpretation belongs here.
 */
export function createRsvpAnalyticsViewModel(
  guests: RsvpAnalyticsGuestRecord[],
): RsvpAnalyticsViewModel {
  let attendingCount = 0;
  let declinedCount = 0;
  let pendingCount = 0;
  const pendingGuests: RsvpAnalyticsViewModel['pendingGuests'] = [];

  for (const guest of guests) {
    if (guest.rsvp_status === 'attending') {
      attendingCount += 1;
      continue;
    }

    if (guest.rsvp_status === 'declined') {
      declinedCount += 1;
      continue;
    }

    pendingCount += 1;

    if (pendingGuests.length < PENDING_GUEST_SAMPLE_LIMIT) {
      pendingGuests.push({ displayName: guest.display_name });
    }
  }

  const activeGuestCount = guests.length;
  const respondedCount = attendingCount + declinedCount;
  const respondedPercentage =
    activeGuestCount === 0 ? 0 : Math.round((respondedCount / activeGuestCount) * 100);

  return {
    activeGuestCount,
    attendingCount,
    declinedCount,
    pendingCount,
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
