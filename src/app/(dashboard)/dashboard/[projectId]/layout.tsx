import { notFound } from 'next/navigation';

import { requireCurrentUser } from '@/modules/auth/current-user';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';
import { getOwnedProjectById } from '@/modules/projects/project.repository';

type ProjectLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
};

/** Defense-in-depth project ownership check behind proxy-level authentication. */
export default async function ProjectDashboardLayout({ children, params }: ProjectLayoutProps) {
  const [{ projectId }, user] = await Promise.all([params, requireCurrentUser()]);

  try {
    await getOwnedProjectById(projectId, user.id);
  } catch (error) {
    if (error instanceof ProjectAccessDeniedError) {
      notFound();
    }

    throw error;
  }

  return children;
}
