import { beforeEach, describe, expect, it, vi } from 'vitest';

const { redirectMock } = vi.hoisted(() => ({ redirectMock: vi.fn() }));

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}));

import GuestbookDashboardPage, {
  dynamic,
  fetchCache,
  revalidate,
} from '@/app/(dashboard)/dashboard/[projectId]/guestbook/page';

const projectId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

describe('SRY-039 guestbook compatibility route', () => {
  beforeEach(() => {
    redirectMock.mockReset();
    redirectMock.mockImplementation(() => {
      throw new Error('NEXT_REDIRECT');
    });
  });

  it('redirects the legacy guestbook route into Respons Tamu Ucapan without loading duplicate owner data', async () => {
    await expect(
      GuestbookDashboardPage({ params: Promise.resolve({ projectId }) }),
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(dynamic).toBe('force-dynamic');
    expect(revalidate).toBe(0);
    expect(fetchCache).toBe('force-no-store');
    expect(redirectMock).toHaveBeenCalledWith(`/dashboard/${projectId}/rsvp?tab=ucapan`);
  });
});
