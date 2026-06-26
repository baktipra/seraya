import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

const { getOwnedProjectMock, listRsvpAnalyticsGuestsMock, requireCurrentUserMock } = vi.hoisted(
  () => ({
    getOwnedProjectMock: vi.fn(),
    listRsvpAnalyticsGuestsMock: vi.fn(),
    requireCurrentUserMock: vi.fn(),
  }),
);

vi.mock('@/modules/auth/current-user', () => ({ requireCurrentUser: requireCurrentUserMock }));
vi.mock('@/modules/projects/project.repository', () => ({
  getOwnedProjectById: getOwnedProjectMock,
}));
vi.mock('../rsvp-analytics.repository', () => ({
  listRsvpAnalyticsGuestsForVerifiedProject: listRsvpAnalyticsGuestsMock,
}));

import {
  createRsvpAnalyticsViewModel,
  getRsvpAnalyticsForCurrentUser,
} from '../rsvp-analytics.service';

const project = {
  account_id: '11111111-1111-1111-1111-111111111111',
  default_timezone: 'Asia/Jakarta',
  deleted_at: null,
  event_city: 'Jakarta',
  event_date_primary: '2027-08-17',
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  person_one_name: 'Raka',
  person_two_name: 'Nadia',
  slug: 'raka-nadia',
  status: 'published',
};

describe('SRY-028 RSVP attendance analytics', () => {
  beforeEach(() => {
    getOwnedProjectMock.mockReset().mockResolvedValue(project);
    listRsvpAnalyticsGuestsMock.mockReset();
    requireCurrentUserMock.mockReset().mockResolvedValue({ id: project.account_id });
  });

  it('keeps guest-group metrics separate from invited and confirmed people totals', () => {
    const analytics = createRsvpAnalyticsViewModel([
      { display_name: 'Alya', party_size: 4, rsvp_attendee_count: null, rsvp_status: 'pending' },
      { display_name: 'Bima', party_size: 3, rsvp_attendee_count: 2, rsvp_status: 'attending' },
      { display_name: 'Citra', party_size: 2, rsvp_attendee_count: null, rsvp_status: 'attending' },
      { display_name: 'Dara', party_size: 1, rsvp_attendee_count: null, rsvp_status: 'declined' },
    ]);

    expect(analytics).toEqual({
      activeGuestCount: 4,
      attendingCountUnknownGuestCount: 1,
      attendingGuestCount: 2,
      confirmedAttendeeCount: 2,
      declinedGuestCount: 1,
      invitedPeopleCount: 10,
      pendingGuestCount: 1,
      pendingGuests: [{ displayName: 'Alya' }],
      respondedCount: 3,
      respondedPercentage: 75,
    });
  });

  it('caps pending sample by active pending guest order and never weights attendance by party size', () => {
    const guests = Array.from({ length: 6 }, (_, index) => ({
      display_name: `Tamu ${index + 1}`,
      party_size: 20,
      rsvp_attendee_count: null,
      rsvp_status: 'pending' as const,
    }));

    const analytics = createRsvpAnalyticsViewModel(guests);

    expect(analytics.pendingGuests).toEqual([
      { displayName: 'Tamu 1' },
      { displayName: 'Tamu 2' },
      { displayName: 'Tamu 3' },
      { displayName: 'Tamu 4' },
      { displayName: 'Tamu 5' },
    ]);
    expect(analytics.pendingGuestCount).toBe(6);
    expect(analytics.invitedPeopleCount).toBe(120);
    expect(analytics.confirmedAttendeeCount).toBe(0);
  });

  it('returns a safe zero state with no people or percentage for no active guests', () => {
    expect(createRsvpAnalyticsViewModel([])).toEqual({
      activeGuestCount: 0,
      attendingCountUnknownGuestCount: 0,
      attendingGuestCount: 0,
      confirmedAttendeeCount: 0,
      declinedGuestCount: 0,
      invitedPeopleCount: 0,
      pendingGuestCount: 0,
      pendingGuests: [],
      respondedCount: 0,
      respondedPercentage: 0,
    });
  });

  it('verifies owner scope before the narrow RSVP record read', async () => {
    listRsvpAnalyticsGuestsMock.mockResolvedValue([
      { display_name: 'Alya', party_size: 2, rsvp_attendee_count: 1, rsvp_status: 'attending' },
    ]);

    const result = await getRsvpAnalyticsForCurrentUser(project.id);

    expect(getOwnedProjectMock).toHaveBeenCalledWith(project.id, project.account_id);
    expect(listRsvpAnalyticsGuestsMock).toHaveBeenCalledWith(project);
    expect(result.analytics).toMatchObject({
      attendingGuestCount: 1,
      confirmedAttendeeCount: 1,
    });
  });

  it('does not read guest records when owner-project verification fails', async () => {
    getOwnedProjectMock.mockRejectedValue(new ProjectAccessDeniedError());

    await expect(
      getRsvpAnalyticsForCurrentUser('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
    ).rejects.toBeInstanceOf(ProjectAccessDeniedError);

    expect(listRsvpAnalyticsGuestsMock).not.toHaveBeenCalled();
  });

  it('does not expose IDs, link state, guest contacts, or raw party rows in the DTO', () => {
    const analytics = createRsvpAnalyticsViewModel([
      { display_name: 'Alya', party_size: 2, rsvp_attendee_count: null, rsvp_status: 'pending' },
    ]);

    expect(Object.keys(analytics).sort()).toEqual([
      'activeGuestCount',
      'attendingCountUnknownGuestCount',
      'attendingGuestCount',
      'confirmedAttendeeCount',
      'declinedGuestCount',
      'invitedPeopleCount',
      'pendingGuestCount',
      'pendingGuests',
      'respondedCount',
      'respondedPercentage',
    ]);
    expect(analytics.pendingGuests[0]).toEqual({ displayName: 'Alya' });
  });
});
