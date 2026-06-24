import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createServerSupabaseClientMock, eqMock, fromMock, isMock, orderMock, selectMock } =
  vi.hoisted(() => ({
    createServerSupabaseClientMock: vi.fn(),
    eqMock: vi.fn(),
    fromMock: vi.fn(),
    isMock: vi.fn(),
    orderMock: vi.fn(),
    selectMock: vi.fn(),
  }));

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
  status: 'draft',
};

describe('SRY-020 RSVP analytics repository boundary', () => {
  beforeEach(() => {
    createServerSupabaseClientMock.mockReset();
    eqMock.mockReset();
    fromMock.mockReset();
    isMock.mockReset();
    orderMock.mockReset();
    selectMock.mockReset();

    orderMock.mockResolvedValue({
      data: [
        { display_name: 'Alya', rsvp_status: 'pending' },
        { display_name: 'Bima', rsvp_status: 'attending' },
      ],
      error: null,
    });
    isMock.mockReturnValue({ order: orderMock });
    eqMock.mockReturnValue({ is: isMock });
    selectMock.mockReturnValue({ eq: eqMock });
    fromMock.mockReturnValue({ select: selectMock });
    createServerSupabaseClientMock.mockResolvedValue({ from: fromMock });
  });

  it('uses one narrow active-guest query in the established owner/RLS boundary', async () => {
    const records = await listRsvpAnalyticsGuestsForVerifiedProject(project);

    expect(fromMock).toHaveBeenCalledWith('guests');
    expect(selectMock).toHaveBeenCalledWith('display_name, rsvp_status');
    expect(eqMock).toHaveBeenCalledWith('project_id', project.id);
    expect(isMock).toHaveBeenCalledWith('deleted_at', null);
    expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: true });
    expect(records).toEqual([
      { display_name: 'Alya', rsvp_status: 'pending' },
      { display_name: 'Bima', rsvp_status: 'attending' },
    ]);
  });

  it('does not select party size, guest IDs, links, tokens, payment data, or updated_at', async () => {
    await listRsvpAnalyticsGuestsForVerifiedProject(project);

    const selectedColumns = selectMock.mock.calls[0]?.[0] ?? '';
    expect(selectedColumns).not.toContain('party_size');
    expect(selectedColumns).not.toContain('id');
    expect(selectedColumns).not.toContain('token');
    expect(selectedColumns).not.toContain('payment');
    expect(selectedColumns).not.toContain('updated_at');
  });
});
