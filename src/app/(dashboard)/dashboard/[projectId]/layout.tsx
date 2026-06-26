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
 * Defense-in-depth project shell. Navigation visibility comes from an
 * owner-scoped request-local readiness projection; direct routes keep their
 * own authorization and never rely on this presentation layer.
 */
export default async function ProjectDashboardLayout({ children, params }: ProjectLayoutProps) {
  const { projectId } = await params;
  const readiness = await getProjectReadinessOrNotFound(projectId);

  return (
    <div className="space-y-5 sm:space-y-7">
      <ProjectNavigation projectId={projectId} readiness={readiness} />
      {children}
    </div>
  );
}
