import { notFound } from 'next/navigation';

import { getOwnedProjectContextForRequest } from '@/modules/auth/dashboard-request-context';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

type ProjectLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
};

/** Defense-in-depth owner scope shared request-locally with nested project pages. */
export default async function ProjectDashboardLayout({ children, params }: ProjectLayoutProps) {
  const { projectId } = await params;

  try {
    await getOwnedProjectContextForRequest(projectId);
  } catch (error) {
    if (error instanceof ProjectAccessDeniedError) {
      notFound();
    }

    throw error;
  }

  return children;
}
