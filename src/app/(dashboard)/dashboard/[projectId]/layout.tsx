import { notFound } from 'next/navigation';

import { ProjectNavigation } from '@/components/dashboard/project-navigation';
import { measureWorkspaceServerLoad } from '@/lib/performance/workspace-performance.server';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';
import {
  getProjectShellForRequest,
  type ProjectShellV1,
} from '@/modules/projects/project-shell.service';

type ProjectLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
};

async function getProjectShellOrNotFound(projectId: string): Promise<ProjectShellV1> {
  try {
    return await measureWorkspaceServerLoad(
      {
        operation: 'project-shell-identity',
        workspace: 'project-shell',
      },
      () => getProjectShellForRequest(projectId),
    );
  } catch (error) {
    if (error instanceof ProjectAccessDeniedError) {
      notFound();
    }

    throw error;
  }
}

/**
 * Defense-in-depth project shell. Authorization stays route-owned; canonical
 * rail width and gap are owned by design tokens and workspace-anatomy.css.
 */
export default async function ProjectDashboardLayout({ children, params }: ProjectLayoutProps) {
  const { projectId } = await params;
  const shell = await getProjectShellOrNotFound(projectId);

  return (
    <>
      <a className="seraya-skip-link" href="#project-workspace-content">
        Lewati navigasi proyek
      </a>
      <div className="min-w-0" data-dashboard-width="wide" data-project-workspace-shell>
        <ProjectNavigation
          coupleLabel={shell.coupleLabel}
          projectId={projectId}
          statusLabel={shell.statusLabel}
        />
        <div className="min-w-0" data-project-workspace-main>
          {children}
        </div>
      </div>
    </>
  );
}
