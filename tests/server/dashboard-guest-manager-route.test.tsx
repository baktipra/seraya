import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

const { getGuestManagerMock, notFoundMock } = vi.hoisted(() => ({
  getGuestManagerMock: vi.fn(),
  notFoundMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({ notFound: notFoundMock }));
vi.mock('@/components/projects/guest-manager', () => ({
  GuestManager: ({ initialGuests, projectId }: { initialGuests: unknown[]; projectId: string }) => (
    <div data-project-id={projectId} data-guest-count={initialGuests.length}>
      Daftar tamu
    </div>
  ),
}));
vi.mock('@/modules/guests/guest.service', () => ({
  getGuestManagerForCurrentUser: getGuestManagerMock,
}));

import GuestsPage from '@/app/(dashboard)/dashboard/[projectId]/guests/page';

const projectId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

describe('SRY-012 private guest manager route', () => {
  beforeEach(() => {
    getGuestManagerMock.mockReset();
    notFoundMock.mockReset();
    notFoundMock.mockImplementation(() => {
      throw new Error('NEXT_NOT_FOUND');
    });
  });

  it('loads only the current owner guest manager payload', async () => {
    getGuestManagerMock.mockResolvedValue({
      guests: [
        {
          display_name: 'Rani',
          group_label: null,
          id: 'guest-id',
          link_state: 'not_created',
          party_size: 1,
          rsvp_status: 'pending',
        },
      ],
      project: { id: projectId },
    });

    const page = await GuestsPage({ params: Promise.resolve({ projectId }) });
    const html = renderToStaticMarkup(page);

    expect(getGuestManagerMock).toHaveBeenCalledWith(projectId);
    expect(html).toContain('data-guest-count="1"');
    expect(html).toContain(`data-project-id="${projectId}"`);
  });

  it('does not render a guessed cross-account guest list', async () => {
    getGuestManagerMock.mockRejectedValue(new ProjectAccessDeniedError());

    await expect(
      GuestsPage({
        params: Promise.resolve({ projectId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' }),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });
});
