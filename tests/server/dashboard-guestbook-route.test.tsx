import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

const { getGuestbookInboxMock, getOwnedProjectContextMock, getReadinessMock, notFoundMock } =
  vi.hoisted(() => ({
    getGuestbookInboxMock: vi.fn(),
    getOwnedProjectContextMock: vi.fn(),
    getReadinessMock: vi.fn(),
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
vi.mock('@/modules/readiness', () => ({
  getWeddingReadinessForRequest: getReadinessMock,
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

function createReadiness({
  hasActivePersonalLinks = true,
  hasPublishedSnapshot = true,
}: {
  hasActivePersonalLinks?: boolean;
  hasPublishedSnapshot?: boolean;
} = {}) {
  return {
    invitation: { hasPublishedSnapshot },
    responses: { hasActivePersonalLinks },
  };
}

describe('SRY-031 owner guestbook dashboard route', () => {
  beforeEach(() => {
    getGuestbookInboxMock.mockReset();
    getOwnedProjectContextMock.mockReset().mockResolvedValue(project);
    getReadinessMock.mockReset().mockResolvedValue(createReadiness());
    notFoundMock.mockReset();
    notFoundMock.mockImplementation(() => {
      throw new Error('NEXT_NOT_FOUND');
    });
  });

  it('remains private, dynamic, and no-store while rendering only owner inbox data after active personal links exist', async () => {
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
    expect(getReadinessMock).toHaveBeenCalledWith(project.id);
    expect(getOwnedProjectContextMock).toHaveBeenCalledWith(project.id);
    expect(getGuestbookInboxMock).toHaveBeenCalledWith(project);
    expect(html).toContain('Ucapan &amp; Doa');
    expect(html).toContain('Keluarga Budi');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt; Semoga bahagia');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('Hapus ucapan');
  });

  it('shows a truthful unavailable state before personal invitations exist without loading guestbook entries', async () => {
    getReadinessMock.mockResolvedValue(
      createReadiness({ hasActivePersonalLinks: false, hasPublishedSnapshot: true }),
    );

    const page = await GuestbookDashboardPage({
      params: Promise.resolve({ projectId: project.id }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain('Ucapan &amp; Doa belum tersedia');
    expect(html).toContain(
      'Ucapan dari tamu akan muncul setelah undangan pribadi mulai disiapkan.',
    );
    expect(html).toContain(`href="/dashboard/${project.id}/delivery"`);
    expect(getOwnedProjectContextMock).not.toHaveBeenCalled();
    expect(getGuestbookInboxMock).not.toHaveBeenCalled();
  });

  it('uses generic not-found behavior for foreign or soft-deleted project readiness', async () => {
    getReadinessMock.mockRejectedValue(new ProjectAccessDeniedError());

    await expect(
      GuestbookDashboardPage({ params: Promise.resolve({ projectId: project.id }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(getGuestbookInboxMock).not.toHaveBeenCalled();
  });
});
