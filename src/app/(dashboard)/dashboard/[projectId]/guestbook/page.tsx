import { notFound } from 'next/navigation';

import { GuestbookDashboard } from '@/components/projects/guestbook-dashboard';
import { getOwnedProjectContextForRequest } from '@/modules/auth/dashboard-request-context';
import { getGuestbookInboxForVerifiedProject } from '@/modules/guestbook';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

type GuestbookDashboardPageProps = {
  params: Promise<{ projectId: string }>;
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function GuestbookDashboardPage({ params }: GuestbookDashboardPageProps) {
  const { projectId } = await params;
  let inbox: Awaited<ReturnType<typeof getGuestbookInboxForVerifiedProject>>;

  try {
    const project = await getOwnedProjectContextForRequest(projectId);
    inbox = await getGuestbookInboxForVerifiedProject(project);
  } catch (error) {
    if (error instanceof ProjectAccessDeniedError) {
      notFound();
    }

    throw error;
  }

  return (
    <GuestbookDashboard
      entries={inbox.entries}
      projectId={inbox.project.id}
      timezone={inbox.project.defaultTimezone}
    />
  );
}
