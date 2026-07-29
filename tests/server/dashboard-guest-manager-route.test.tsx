import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

const { getGuestManagerMock, getOwnedProjectContextMock, notFoundMock } = vi.hoisted(() => ({
  getGuestManagerMock: vi.fn(),
  getOwnedProjectContextMock: vi.fn(),
  notFoundMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({ notFound: notFoundMock }));
vi.mock('@/components/projects/native-guest-manager', () => ({
  NativeGuestManager: ({
    initialGuests,
    projectId,
  }: {
    initialGuests: unknown[];
    projectId: string;
  }) => (
    <div data-guest-count={initialGuests.length} data-project-id={projectId}>
      Daftar tamu
    </div>
  ),
}));
vi.mock('@/modules/auth/dashboard-request-context', () => ({
  getOwnedProjectContextForRequest: getOwnedProjectContextMock,
}));
vi.mock('@/modules/guests/guest.service', () => ({
  getGuestManagerForVerifiedProject: getGuestManagerMock,
}));

import GuestsPage from '@/app/(dashboard)/dashboard/[projectId]/guests/page';

const projectId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const project = { id: projectId };

describe('SRY-012 private guest manager route', () => {
  beforeEach(() => {
    getGuestManagerMock.mockReset();
    getOwnedProjectContextMock.mockReset().mockResolvedValue(project);
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
      project,
    });

    const page = await GuestsPage({ params: Promise.resolve({ projectId }) });
    const html = renderToStaticMarkup(page);

    expect(getOwnedProjectContextMock).toHaveBeenCalledWith(projectId);
    expect(getGuestManagerMock).toHaveBeenCalledWith(project);
    expect(html).toContain('data-guest-count="1"');
    expect(html).toContain(`data-project-id="${projectId}"`);
  });

  it('does not render a guessed cross-account guest list', async () => {
    getOwnedProjectContextMock.mockRejectedValue(new ProjectAccessDeniedError());

    await expect(
      GuestsPage({
        params: Promise.resolve({ projectId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' }),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });
});
