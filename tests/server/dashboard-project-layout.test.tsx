import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

const { getReadinessMock, notFoundMock } = vi.hoisted(() => ({
  getReadinessMock: vi.fn(),
  notFoundMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({ notFound: notFoundMock }));
vi.mock('@/components/dashboard/project-navigation', () => ({
  ProjectNavigation: ({ projectId }: { projectId: string }) => (
    <nav data-project-navigation-id={projectId}>Project navigation</nav>
  ),
}));
vi.mock('@/modules/readiness', () => ({
  getWeddingReadinessForRequest: getReadinessMock,
}));

import ProjectDashboardLayout from '@/app/(dashboard)/dashboard/[projectId]/layout';

const readiness = {
  invitation: { hasPublishedSnapshot: false },
  responses: { hasActivePersonalLinks: false },
};

describe('SRY-031 project dashboard layout readiness scope', () => {
  beforeEach(() => {
    getReadinessMock.mockReset().mockResolvedValue(readiness);
    notFoundMock.mockReset();
    notFoundMock.mockImplementation(() => {
      throw new Error('NEXT_NOT_FOUND');
    });
  });

  it('establishes project-scoped owner readiness for conditional navigation without relying on child-route visibility', async () => {
    const page = await ProjectDashboardLayout({
      children: <div>Private child</div>,
      params: Promise.resolve({ projectId: 'project-a' }),
    });
    const html = renderToStaticMarkup(page);

    expect(getReadinessMock).toHaveBeenCalledTimes(1);
    expect(getReadinessMock).toHaveBeenCalledWith('project-a');
    expect(html).toContain('data-project-navigation-id="project-a"');
    expect(html).toContain('Private child');
  });

  it('keeps foreign and soft-deleted project access on the generic unavailable path', async () => {
    getReadinessMock.mockRejectedValue(new ProjectAccessDeniedError());

    await expect(
      ProjectDashboardLayout({
        children: <div>Private child</div>,
        params: Promise.resolve({ projectId: 'project-foreign' }),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });
});
