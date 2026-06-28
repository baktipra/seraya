import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

const {
  createRsvpResponseXlsxMock,
  getOwnedProjectMock,
  listRsvpAnalyticsGuestsMock,
  listRsvpExportGuestsMock,
  requireCurrentUserMock,
} = vi.hoisted(() => ({
  createRsvpResponseXlsxMock: vi.fn(),
  getOwnedProjectMock: vi.fn(),
  listRsvpAnalyticsGuestsMock: vi.fn(),
  listRsvpExportGuestsMock: vi.fn(),
  requireCurrentUserMock: vi.fn(),
}));

vi.mock('@/modules/auth/current-user', () => ({ requireCurrentUser: requireCurrentUserMock }));
vi.mock('@/modules/projects/project.repository', () => ({
  getOwnedProjectById: getOwnedProjectMock,
}));
vi.mock('../rsvp-analytics.repository', () => ({
  listRsvpAnalyticsGuestsForVerifiedProject: listRsvpAnalyticsGuestsMock,
  listRsvpExportGuestsForVerifiedProject: listRsvpExportGuestsMock,
}));
vi.mock('../rsvp-response-xlsx', () => ({
  createRsvpResponseXlsx: createRsvpResponseXlsxMock,
}));

import {
  createRsvpAnalyticsViewModel,
  getRsvpAnalyticsForCurrentUser,
  getRsvpResponseXlsxForCurrentUser,
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

function guest(
  displayName: string,
  overrides: Partial<{
    group_label: string | null;
    id: string;
    party_size: number;
    rsvp_attendee_count: number | null;
    rsvp_status: 'attending' | 'declined' | 'pending';
    updated_at: string;
    whatsapp_phone_e164: string | null;
  }> = {},
) {
  return {
    display_name: displayName,
    group_label: null,
    id: `guest-${displayName.toLowerCase()}`,
    party_size: 1,
    rsvp_attendee_count: null,
    rsvp_status: 'pending' as const,
    updated_at: '2027-08-17T09:00:00.000Z',
    whatsapp_phone_e164: null,
    ...overrides,
  };
}

describe('SRY-040 RSVP response analytics', () => {
  beforeEach(() => {
    createRsvpResponseXlsxMock.mockReset().mockResolvedValue(new Uint8Array([1, 2, 3]));
    getOwnedProjectMock.mockReset().mockResolvedValue(project);
    listRsvpAnalyticsGuestsMock.mockReset();
    listRsvpExportGuestsMock.mockReset();
    requireCurrentUserMock.mockReset().mockResolvedValue({ id: project.account_id });
  });

  it('keeps guest-group metrics separate from invited and confirmed people totals', () => {
    const analytics = createRsvpAnalyticsViewModel([
      guest('Alya', { party_size: 4 }),
      guest('Bima', { party_size: 3, rsvp_attendee_count: 2, rsvp_status: 'attending' }),
      guest('Citra', { party_size: 2, rsvp_status: 'attending' }),
      guest('Dara', { rsvp_status: 'declined' }),
    ]);

    expect(analytics).toMatchObject({
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
    expect(analytics.responseRows).toEqual([
      expect.objectContaining({ displayName: 'Alya', rsvpStatus: 'pending' }),
      expect.objectContaining({ displayName: 'Bima', rsvpStatus: 'attending' }),
      expect.objectContaining({ displayName: 'Citra', rsvpStatus: 'attending' }),
      expect.objectContaining({ displayName: 'Dara', rsvpStatus: 'declined' }),
    ]);
  });

  it('caps pending sample by active pending guest order and never weights attendance by party size', () => {
    const guests = Array.from({ length: 6 }, (_, index) =>
      guest(`Tamu ${index + 1}`, { party_size: 20 }),
    );
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
      responseRows: [],
    });
  });

  it('verifies owner scope before the narrow RSVP record read', async () => {
    listRsvpAnalyticsGuestsMock.mockResolvedValue([
      guest('Alya', { party_size: 2, rsvp_attendee_count: 1, rsvp_status: 'attending' }),
    ]);
    const result = await getRsvpAnalyticsForCurrentUser(project.id);
    expect(getOwnedProjectMock).toHaveBeenCalledWith(project.id, project.account_id);
    expect(listRsvpAnalyticsGuestsMock).toHaveBeenCalledWith(project);
    expect(result.analytics).toMatchObject({ attendingGuestCount: 1, confirmedAttendeeCount: 1 });
  });

  it('does not read guest records when owner-project verification fails', async () => {
    getOwnedProjectMock.mockRejectedValue(new ProjectAccessDeniedError());
    await expect(
      getRsvpAnalyticsForCurrentUser('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
    ).rejects.toBeInstanceOf(ProjectAccessDeniedError);
    expect(listRsvpAnalyticsGuestsMock).not.toHaveBeenCalled();
  });

  it('does not expose link, contact, token, or guestbook content in the analytics DTO', () => {
    const analytics = createRsvpAnalyticsViewModel([guest('Alya', { party_size: 2 })]);
    const serialized = JSON.stringify(analytics);
    expect(serialized).not.toContain('token');
    expect(serialized).not.toContain('whatsapp');
    expect(serialized).not.toContain('ciphertext');
    expect(serialized).not.toContain('guestbook');
    expect(analytics.responseRows[0]).toMatchObject({ displayName: 'Alya', partySize: 2 });
  });

  it('builds the private XLSX only after owner verification and keeps WhatsApp in the server-only export map', async () => {
    listRsvpExportGuestsMock.mockResolvedValue([
      guest('Alya', {
        id: 'guest-alya',
        rsvp_attendee_count: 2,
        rsvp_status: 'attending',
        whatsapp_phone_e164: '+628111111111',
      }),
      guest('Bima', { id: 'guest-bima', whatsapp_phone_e164: null }),
    ]);

    await expect(getRsvpResponseXlsxForCurrentUser(project.id)).resolves.toEqual(
      new Uint8Array([1, 2, 3]),
    );

    expect(getOwnedProjectMock).toHaveBeenCalledWith(project.id, project.account_id);
    expect(listRsvpExportGuestsMock).toHaveBeenCalledWith(project);
    const exportInput = createRsvpResponseXlsxMock.mock.calls[0]?.[0];
    expect(exportInput.rows).toEqual([
      expect.objectContaining({ guestId: 'guest-alya', rsvpAttendeeCount: 2 }),
      expect.objectContaining({ guestId: 'guest-bima', rsvpStatus: 'pending' }),
    ]);
    expect(Array.from(exportInput.whatsappPhoneE164ByGuestId.entries())).toEqual([
      ['guest-alya', '+628111111111'],
      ['guest-bima', null],
    ]);
  });
});
