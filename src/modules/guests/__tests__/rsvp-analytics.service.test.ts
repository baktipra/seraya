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
  status: 'draft',
};

describe('SRY-020 RSVP analytics current-state service', () => {
  beforeEach(() => {
    getOwnedProjectMock.mockReset();
    listRsvpAnalyticsGuestsMock.mockReset();
    requireCurrentUserMock.mockReset();

    requireCurrentUserMock.mockResolvedValue({ id: project.account_id });
    getOwnedProjectMock.mockResolvedValue(project);
  });

  it('calculates active guest-record status counts and a deterministic pending sample', () => {
    const analytics = createRsvpAnalyticsViewModel([
      { display_name: 'Alya', rsvp_status: 'pending' },
      { display_name: 'Bima', rsvp_status: 'attending' },
      { display_name: 'Citra', rsvp_status: 'declined' },
      { display_name: 'Dara', rsvp_status: 'pending' },
    ]);

    expect(analytics).toEqual({
      activeGuestCount: 4,
      attendingCount: 1,
      declinedCount: 1,
      pendingCount: 2,
      pendingGuests: [{ displayName: 'Alya' }, { displayName: 'Dara' }],
      respondedCount: 2,
      respondedPercentage: 50,
    });
  });

  it('uses guest records rather than party-size-like extra data and caps pending guests at five', () => {
    const guests = [
      { display_name: 'Satu', party_size: 20, rsvp_status: 'pending' },
      { display_name: 'Dua', party_size: 20, rsvp_status: 'pending' },
      { display_name: 'Tiga', party_size: 20, rsvp_status: 'pending' },
      { display_name: 'Empat', party_size: 20, rsvp_status: 'pending' },
      { display_name: 'Lima', party_size: 20, rsvp_status: 'pending' },
      { display_name: 'Enam', party_size: 20, rsvp_status: 'pending' },
    ] as unknown as Parameters<typeof createRsvpAnalyticsViewModel>[0];

    const analytics = createRsvpAnalyticsViewModel(guests);

    expect(analytics.activeGuestCount).toBe(6);
    expect(analytics.pendingCount).toBe(6);
    expect(analytics.respondedCount).toBe(0);
    expect(analytics.respondedPercentage).toBe(0);
    expect(analytics.pendingGuests).toEqual([
      { displayName: 'Satu' },
      { displayName: 'Dua' },
      { displayName: 'Tiga' },
      { displayName: 'Empat' },
      { displayName: 'Lima' },
    ]);
  });

  it('handles an empty active guest directory with a truthful zero percent', () => {
    expect(createRsvpAnalyticsViewModel([])).toEqual({
      activeGuestCount: 0,
      attendingCount: 0,
      declinedCount: 0,
      pendingCount: 0,
      pendingGuests: [],
      respondedCount: 0,
      respondedPercentage: 0,
    });
  });

  it('verifies owner project scope before loading the narrow guest data', async () => {
    listRsvpAnalyticsGuestsMock.mockResolvedValue([
      { display_name: 'Alya', rsvp_status: 'attending' },
    ]);

    const result = await getRsvpAnalyticsForCurrentUser(project.id);

    expect(getOwnedProjectMock).toHaveBeenCalledWith(project.id, project.account_id);
    expect(listRsvpAnalyticsGuestsMock).toHaveBeenCalledWith(project);
    expect(result.analytics).toMatchObject({ attendingCount: 1, activeGuestCount: 1 });
  });

  it('does not query guest analytics for an unavailable or foreign-owned project', async () => {
    getOwnedProjectMock.mockRejectedValue(new ProjectAccessDeniedError());

    await expect(
      getRsvpAnalyticsForCurrentUser('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
    ).rejects.toBeInstanceOf(ProjectAccessDeniedError);

    expect(listRsvpAnalyticsGuestsMock).not.toHaveBeenCalled();
  });

  it('returns a DTO without guest IDs, links, tokens, payment fields, or response-history fields', () => {
    const analytics = createRsvpAnalyticsViewModel([
      { display_name: 'Alya', rsvp_status: 'pending' },
    ]);

    expect(Object.keys(analytics).sort()).toEqual([
      'activeGuestCount',
      'attendingCount',
      'declinedCount',
      'pendingCount',
      'pendingGuests',
      'respondedCount',
      'respondedPercentage',
    ]);
    expect(analytics.pendingGuests[0]).toEqual({ displayName: 'Alya' });
  });
});
