import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createAdminSupabaseClientMock,
  eqMock,
  firstIsMock,
  orderMock,
  secondIsMock,
  selectMock,
} = vi.hoisted(() => ({
  createAdminSupabaseClientMock: vi.fn(),
  eqMock: vi.fn(),
  firstIsMock: vi.fn(),
  orderMock: vi.fn(),
  secondIsMock: vi.fn(),
  selectMock: vi.fn(),
}));

vi.mock('@/server/supabase/admin', () => ({
  createAdminSupabaseClient: createAdminSupabaseClientMock,
}));
vi.mock('@/server/supabase/public', () => ({ createPublicSupabaseClient: vi.fn() }));
vi.mock('@/server/supabase/server', () => ({ createServerSupabaseClient: vi.fn() }));

import { listGuestbookEntriesForVerifiedProject } from '../guestbook.repository';

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

describe('guestbook v2 owner inbox repository', () => {
  beforeEach(() => {
    createAdminSupabaseClientMock.mockReset();
    eqMock.mockReset();
    firstIsMock.mockReset();
    orderMock.mockReset();
    secondIsMock.mockReset();
    selectMock.mockReset();

    createAdminSupabaseClientMock.mockReturnValue({ from: () => ({ select: selectMock }) });
    selectMock.mockReturnValue({ eq: eqMock });
    eqMock.mockReturnValue({ is: firstIsMock });
    firstIsMock.mockReturnValue({ is: secondIsMock });
    secondIsMock.mockReturnValue({ order: orderMock });
  });

  it('loads sharing and moderation state without link material', async () => {
    orderMock.mockResolvedValue({
      data: [{
        created_at: '2027-08-17T11:00:00.000Z',
        guest_id: 'guest-new',
        guests: { display_name: 'Citra', group_label: 'Teman' },
        hidden_from_guest_feed: false,
        id: 'entry-new',
        message: 'Semoga bahagia selalu.',
        share_with_guests: true,
        updated_at: '2027-08-17T11:00:00.000Z',
      }],
      error: null,
    });

    const entries = await listGuestbookEntriesForVerifiedProject(project);

    expect(selectMock).toHaveBeenCalledWith(
      'id, guest_id, message, share_with_guests, hidden_from_guest_feed, created_at, updated_at, guests!inner(display_name, group_label, project_id, deleted_at)',
    );
    expect(eqMock).toHaveBeenCalledWith('guests.project_id', project.id);
    expect(entries).toEqual([{
      createdAt: '2027-08-17T11:00:00.000Z',
      groupLabel: 'Teman',
      guestDisplayName: 'Citra',
      guestId: 'guest-new',
      hiddenFromGuestFeed: false,
      id: 'entry-new',
      message: 'Semoga bahagia selalu.',
      shareWithGuests: true,
      updatedAt: '2027-08-17T11:00:00.000Z',
    }]);
    expect(JSON.stringify(entries)).not.toContain('token');
    expect(JSON.stringify(entries)).not.toContain('cipher');
    expect(JSON.stringify(entries)).not.toContain('link');
  });
});
