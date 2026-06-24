import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

const { getOwnedProjectContextMock, notFoundMock } = vi.hoisted(() => ({
  getOwnedProjectContextMock: vi.fn(),
  notFoundMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({ notFound: notFoundMock }));
vi.mock('@/modules/auth/dashboard-request-context', () => ({
  getOwnedProjectContextForRequest: getOwnedProjectContextMock,
}));

import ProjectDashboardLayout from '@/app/(dashboard)/dashboard/[projectId]/layout';

describe('SRY-021A project dashboard layout request scope', () => {
  beforeEach(() => {
    getOwnedProjectContextMock.mockReset().mockResolvedValue({ id: 'project-a' });
    notFoundMock.mockReset();
    notFoundMock.mockImplementation(() => {
      throw new Error('NEXT_NOT_FOUND');
    });
  });

  it('establishes the same request-local owner project context used by nested project pages', async () => {
    const child = <div>Private child</div>;
    await expect(
      ProjectDashboardLayout({
        children: child,
        params: Promise.resolve({ projectId: 'project-a' }),
      }),
    ).resolves.toBe(child);

    expect(getOwnedProjectContextMock).toHaveBeenCalledTimes(1);
    expect(getOwnedProjectContextMock).toHaveBeenCalledWith('project-a');
  });

  it('keeps foreign and soft-deleted project access on the generic unavailable path', async () => {
    getOwnedProjectContextMock.mockRejectedValue(new ProjectAccessDeniedError());

    await expect(
      ProjectDashboardLayout({
        children: <div>Private child</div>,
        params: Promise.resolve({ projectId: 'project-foreign' }),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });
});
