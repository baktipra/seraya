import { notFound } from 'next/navigation';

import { ProjectNavigation } from '@/components/dashboard/project-navigation';
import { measureWorkspaceServerLoad } from '@/lib/performance/workspace-performance.server';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';
import { getWeddingReadinessForRequest } from '@/modules/readiness';
import type { WeddingReadinessV1 } from '@/modules/readiness';

type ProjectLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
};

async function getProjectReadinessOrNotFound(projectId: string): Promise<WeddingReadinessV1> {
  try {
    return await measureWorkspaceServerLoad(
      {
        operation: 'project-shell-readiness',
        workspace: 'project-shell',
      },
      () => getWeddingReadinessForRequest(projectId),
    );
  } catch (error) {
    if (error instanceof ProjectAccessDeniedError) {
      notFound();
    }

    throw error;
  }
}

function getWorkspaceStatusLabel(readiness: WeddingReadinessV1) {
  switch (readiness.invitation.state) {
    case 'published':
      return 'Sudah dipublikasikan';
    case 'published_with_unpublished_changes':
      return 'Perubahan belum diterbitkan';
    case 'ready_to_publish':
      return 'Siap diterbitkan';
    case 'draft_ready_unactivated':
      return 'Draft siap ditinjau';
    case 'draft_incomplete':
      return 'Draft sedang disusun';
  }
}

/**
 * Defense-in-depth project shell. Authorization stays route-owned; canonical
 * rail width and gap are owned by design tokens and workspace-anatomy.css.
 */
export default async function ProjectDashboardLayout({ children, params }: ProjectLayoutProps) {
  const { projectId } = await params;
  const readiness = await getProjectReadinessOrNotFound(projectId);

  return (
    <>
      <a className="seraya-skip-link" href="#project-workspace-content">
        Lewati navigasi proyek
      </a>
      <div className="min-w-0" data-dashboard-width="wide" data-project-workspace-shell>
        <ProjectNavigation
          coupleLabel={readiness.identity.coupleLabel}
          projectId={projectId}
          statusLabel={getWorkspaceStatusLabel(readiness)}
        />
        <div className="min-w-0" data-project-workspace-main>
          {children}
        </div>
      </div>
    </>
  );
}
