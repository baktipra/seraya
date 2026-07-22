import { notFound } from 'next/navigation';

import { ProjectNavigation } from '@/components/dashboard/project-navigation';
import { getWeddingReadinessForRequest } from '@/modules/readiness';
import type { WeddingReadinessV1 } from '@/modules/readiness';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

type ProjectLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
};

async function getProjectReadinessOrNotFound(projectId: string): Promise<WeddingReadinessV1> {
  try {
    return await getWeddingReadinessForRequest(projectId);
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
 * Defense-in-depth project shell. The readiness read verifies the owner scope
 * before navigation renders; every direct route still owns its own authorization.
 *
 * Geometry is intentionally owned here: one 15rem project rail, one 2rem gap,
 * and one minmax content slot shared by every project workspace.
 */
export default async function ProjectDashboardLayout({ children, params }: ProjectLayoutProps) {
  const { projectId } = await params;
  const readiness = await getProjectReadinessOrNotFound(projectId);

  return (
    <div
      className="min-w-0 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start lg:gap-8"
      data-dashboard-width="wide"
      data-project-workspace-shell
    >
      <ProjectNavigation
        coupleLabel={readiness.identity.coupleLabel}
        projectId={projectId}
        statusLabel={getWorkspaceStatusLabel(readiness)}
      />
      <div className="min-w-0" data-project-workspace-main>
        {children}
      </div>
    </div>
  );
}
