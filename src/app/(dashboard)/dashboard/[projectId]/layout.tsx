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

/**
 * Defense-in-depth project shell. The readiness read verifies the owner scope
 * before navigation renders; every direct route still owns its own authorization.
 */
export default async function ProjectDashboardLayout({ children, params }: ProjectLayoutProps) {
  const { projectId } = await params;
  await getProjectReadinessOrNotFound(projectId);

  return (
    <div className="space-y-5 sm:space-y-7">
      <ProjectNavigation projectId={projectId} />
      {children}
    </div>
  );
}
