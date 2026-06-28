import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createAdminSupabaseClientMock, eqMock, firstIsMock, orderMock, secondIsMock, selectMock } =
  vi.hoisted(() => ({
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
vi.mock('@/server/supabase/public', () => ({
  createPublicSupabaseClient: vi.fn(),
}));

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

describe('SRY-040 owner guestbook inbox repository', () => {
  beforeEach(() => {
    createAdminSupabaseClientMock.mockReset();
    eqMock.mockReset();
    firstIsMock.mockReset();
    orderMock.mockReset();
    secondIsMock.mockReset();
    selectMock.mockReset();

    createAdminSupabaseClientMock.mockReturnValue({
      from: () => ({ select: selectMock }),
    });
    selectMock.mockReturnValue({ eq: eqMock });
    eqMock.mockReturnValue({ is: firstIsMock });
    firstIsMock.mockReturnValue({ is: secondIsMock });
    secondIsMock.mockReturnValue({ order: orderMock });
  });

  it('loads a narrow active owner inbox newest-first with the guest group but no link material', async () => {
    orderMock.mockResolvedValue({
      data: [
        {
          created_at: '2027-08-17T11:00:00.000Z',
          guest_id: 'guest-new',
          guests: { display_name: 'Citra', group_label: 'Teman' },
          id: 'entry-new',
          message: 'Semoga bahagia selalu.',
          updated_at: '2027-08-17T11:00:00.000Z',
        },
        {
          created_at: '2027-08-17T09:00:00.000Z',
          guest_id: 'guest-old',
          guests: { display_name: 'Alya', group_label: null },
          id: 'entry-old',
          message: 'Doa terbaik untuk kalian.',
          updated_at: '2027-08-17T09:00:00.000Z',
        },
      ],
      error: null,
    });

    const entries = await listGuestbookEntriesForVerifiedProject(project);

    expect(selectMock).toHaveBeenCalledWith(
      'id, guest_id, message, created_at, updated_at, guests!inner(display_name, group_label, project_id, deleted_at)',
    );
    expect(eqMock).toHaveBeenCalledWith('guests.project_id', project.id);
    expect(firstIsMock).toHaveBeenCalledWith('deleted_at', null);
    expect(secondIsMock).toHaveBeenCalledWith('guests.deleted_at', null);
    expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(entries).toEqual([
      {
        createdAt: '2027-08-17T11:00:00.000Z',
        groupLabel: 'Teman',
        guestDisplayName: 'Citra',
        guestId: 'guest-new',
        id: 'entry-new',
        message: 'Semoga bahagia selalu.',
        updatedAt: '2027-08-17T11:00:00.000Z',
      },
      {
        createdAt: '2027-08-17T09:00:00.000Z',
        groupLabel: null,
        guestDisplayName: 'Alya',
        guestId: 'guest-old',
        id: 'entry-old',
        message: 'Doa terbaik untuk kalian.',
        updatedAt: '2027-08-17T09:00:00.000Z',
      },
    ]);
    expect(JSON.stringify(entries)).not.toContain('token');
    expect(JSON.stringify(entries)).not.toContain('cipher');
    expect(JSON.stringify(entries)).not.toContain('link');
  });
});
