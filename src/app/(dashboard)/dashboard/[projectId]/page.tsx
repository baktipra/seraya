import { notFound } from 'next/navigation';

import { ProjectOverviewBootstrap } from '@/components/projects/project-overview-bootstrap';
import { WorkspacePage } from '@/components/workspace/workspace-page';
import { getWeddingReadinessForRequest } from '@/modules/readiness';
import type { WeddingReadinessV1 } from '@/modules/readiness';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

type ProjectDashboardPageProps = {
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

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function ProjectDashboardPage({ params }: ProjectDashboardPageProps) {
  const { projectId } = await params;
  const readiness = await getProjectReadinessOrNotFound(projectId);

  return (
    <WorkspacePage width="standard">
      <ProjectOverviewBootstrap projectId={projectId} readiness={readiness} />
    </WorkspacePage>
  );
}
