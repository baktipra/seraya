import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

const { getProjectShellMock, notFoundMock } = vi.hoisted(() => ({
  getProjectShellMock: vi.fn(),
  notFoundMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({ notFound: notFoundMock }));
vi.mock('@/components/dashboard/project-navigation', () => ({
  ProjectNavigation: ({
    coupleLabel,
    projectId,
    statusLabel,
  }: {
    coupleLabel: string;
    projectId: string;
    statusLabel: string;
  }) => (
    <nav
      data-project-navigation-couple={coupleLabel}
      data-project-navigation-id={projectId}
      data-project-navigation-status={statusLabel}
    >
      Project navigation
    </nav>
  ),
}));
vi.mock('@/modules/projects/project-shell.service', () => ({
  getProjectShellForRequest: getProjectShellMock,
}));

import ProjectDashboardLayout from '@/app/(dashboard)/dashboard/[projectId]/layout';

const shell = {
  coupleLabel: 'Raka & Nadia',
  statusLabel: 'Workspace aktif',
};

describe('P0-A3 lightweight project dashboard shell scope', () => {
  beforeEach(() => {
    getProjectShellMock.mockReset().mockResolvedValue(shell);
    notFoundMock.mockReset();
    notFoundMock.mockImplementation(() => {
      throw new Error('NEXT_NOT_FOUND');
    });
  });

  it('establishes one lightweight owner-verified shell without child-route readiness', async () => {
    const page = await ProjectDashboardLayout({
      children: <div>Private child</div>,
      params: Promise.resolve({ projectId: 'project-a' }),
    });
    const html = renderToStaticMarkup(page);

    expect(getProjectShellMock).toHaveBeenCalledTimes(1);
    expect(getProjectShellMock).toHaveBeenCalledWith('project-a');
    expect(html).toContain('data-project-navigation-id="project-a"');
    expect(html).toContain('data-project-navigation-couple="Raka &amp; Nadia"');
    expect(html).toContain('data-project-navigation-status="Workspace aktif"');
    expect(html).toContain('Private child');
  });

  it('keeps foreign and soft-deleted project access on the generic unavailable path', async () => {
    getProjectShellMock.mockRejectedValue(new ProjectAccessDeniedError());

    await expect(
      ProjectDashboardLayout({
        children: <div>Private child</div>,
        params: Promise.resolve({ projectId: 'project-foreign' }),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });
});
