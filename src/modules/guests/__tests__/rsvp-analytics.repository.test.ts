import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createServerSupabaseClientMock, eqMock, isMock, orderMock, selectMock } = vi.hoisted(
  () => ({
    createServerSupabaseClientMock: vi.fn(),
    eqMock: vi.fn(),
    isMock: vi.fn(),
    orderMock: vi.fn(),
    selectMock: vi.fn(),
  }),
);

vi.mock('@/server/supabase/server', () => ({
  createServerSupabaseClient: createServerSupabaseClientMock,
}));

import { listRsvpAnalyticsGuestsForVerifiedProject } from '../rsvp-analytics.repository';

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

describe('SRY-028 RSVP analytics repository', () => {
  beforeEach(() => {
    createServerSupabaseClientMock.mockReset();
    eqMock.mockReset();
    isMock.mockReset();
    orderMock.mockReset();
    selectMock.mockReset();

    createServerSupabaseClientMock.mockResolvedValue({
      from: () => ({ select: selectMock }),
    });
    selectMock.mockReturnValue({ eq: eqMock });
    eqMock.mockReturnValue({ is: isMock });
    isMock.mockReturnValue({ order: orderMock });
  });

  it('uses one narrow active-guest query with the fields needed for truthful current counts', async () => {
    orderMock.mockResolvedValue({
      data: [
        { display_name: 'Alya', party_size: 3, rsvp_attendee_count: 2, rsvp_status: 'attending' },
        { display_name: 'Bima', party_size: 1, rsvp_attendee_count: null, rsvp_status: 'pending' },
      ],
      error: null,
    });

    const records = await listRsvpAnalyticsGuestsForVerifiedProject(project);

    expect(selectMock).toHaveBeenCalledWith(
      'display_name, party_size, rsvp_status, rsvp_attendee_count',
    );
    expect(eqMock).toHaveBeenCalledWith('project_id', project.id);
    expect(isMock).toHaveBeenCalledWith('deleted_at', null);
    expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: true });
    expect(records).toEqual([
      { display_name: 'Alya', party_size: 3, rsvp_attendee_count: 2, rsvp_status: 'attending' },
      { display_name: 'Bima', party_size: 1, rsvp_attendee_count: null, rsvp_status: 'pending' },
    ]);
  });
});
