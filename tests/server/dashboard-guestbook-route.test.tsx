import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

const { getGuestbookInboxMock, getOwnedProjectContextMock, notFoundMock } = vi.hoisted(() => ({
  getGuestbookInboxMock: vi.fn(),
  getOwnedProjectContextMock: vi.fn(),
  notFoundMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({ notFound: notFoundMock }));
vi.mock('@/modules/auth/dashboard-request-context', () => ({
  getOwnedProjectContextForRequest: getOwnedProjectContextMock,
}));
vi.mock('@/modules/guestbook', () => ({
  getGuestbookInboxForVerifiedProject: getGuestbookInboxMock,
  initialGuestbookActionState: { status: 'idle' },
  removeGuestbookEntryAction: vi.fn(),
}));

import GuestbookDashboardPage, {
  dynamic,
  fetchCache,
  revalidate,
} from '@/app/(dashboard)/dashboard/[projectId]/guestbook/page';

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

describe('SRY-027 owner guestbook dashboard route', () => {
  beforeEach(() => {
    getGuestbookInboxMock.mockReset();
    getOwnedProjectContextMock.mockReset();
    notFoundMock.mockReset();
    notFoundMock.mockImplementation(() => {
      throw new Error('NEXT_NOT_FOUND');
    });
    getOwnedProjectContextMock.mockResolvedValue(project);
  });

  it('remains private, dynamic, and no-store while rendering only owner inbox data', async () => {
    getGuestbookInboxMock.mockResolvedValue({
      entries: [
        {
          guestDisplayName: 'Keluarga Budi',
          id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          message: '<script>alert(1)</script> Semoga bahagia',
          updatedAt: '2027-08-17T09:00:00.000Z',
        },
      ],
      project: { defaultTimezone: 'Asia/Jakarta', id: project.id },
    });

    const page = await GuestbookDashboardPage({
      params: Promise.resolve({ projectId: project.id }),
    });
    const html = renderToStaticMarkup(page);

    expect(dynamic).toBe('force-dynamic');
    expect(revalidate).toBe(0);
    expect(fetchCache).toBe('force-no-store');
    expect(getOwnedProjectContextMock).toHaveBeenCalledWith(project.id);
    expect(getGuestbookInboxMock).toHaveBeenCalledWith(project);
    expect(html).toContain('Ucapan &amp; Doa');
    expect(html).toContain('Keluarga Budi');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt; Semoga bahagia');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('Hapus ucapan');
  });

  it('uses generic not-found behavior for foreign or soft-deleted project context', async () => {
    getOwnedProjectContextMock.mockRejectedValue(new ProjectAccessDeniedError());

    await expect(
      GuestbookDashboardPage({ params: Promise.resolve({ projectId: project.id }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(getGuestbookInboxMock).not.toHaveBeenCalled();
  });
});
