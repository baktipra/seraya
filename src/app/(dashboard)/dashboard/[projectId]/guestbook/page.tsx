import { notFound } from 'next/navigation';

import { ResponseUnavailableState } from '@/components/projects/response-unavailable-state';
import { GuestbookDashboard } from '@/components/projects/guestbook-dashboard';
import { getOwnedProjectContextForRequest } from '@/modules/auth/dashboard-request-context';
import { getGuestbookInboxForVerifiedProject } from '@/modules/guestbook';
import { getWeddingReadinessForRequest } from '@/modules/readiness';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

type GuestbookDashboardPageProps = {
  params: Promise<{ projectId: string }>;
};

type GuestbookScreen =
  | { kind: 'unavailable'; showDeliveryAction: boolean }
  | { kind: 'guestbook'; inbox: Awaited<ReturnType<typeof getGuestbookInboxForVerifiedProject>> };

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

async function getGuestbookScreenOrNotFound(projectId: string): Promise<GuestbookScreen> {
  try {
    const readiness = await getWeddingReadinessForRequest(projectId);

    if (!readiness.responses.hasActivePersonalLinks) {
      return {
        kind: 'unavailable',
        showDeliveryAction: readiness.invitation.hasPublishedSnapshot,
      };
    }

    const project = await getOwnedProjectContextForRequest(projectId);
    const inbox = await getGuestbookInboxForVerifiedProject(project);

    return { inbox, kind: 'guestbook' };
  } catch (error) {
    if (error instanceof ProjectAccessDeniedError) {
      notFound();
    }

    throw error;
  }
}

export default async function GuestbookDashboardPage({ params }: GuestbookDashboardPageProps) {
  const { projectId } = await params;
  const screen = await getGuestbookScreenOrNotFound(projectId);

  if (screen.kind === 'unavailable') {
    return (
      <ResponseUnavailableState
        kind="guestbook"
        projectId={projectId}
        showDeliveryAction={screen.showDeliveryAction}
      />
    );
  }

  return (
    <GuestbookDashboard
      entries={screen.inbox.entries}
      projectId={screen.inbox.project.id}
      timezone={screen.inbox.project.defaultTimezone}
    />
  );
}
