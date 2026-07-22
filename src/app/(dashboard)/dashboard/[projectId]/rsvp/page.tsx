import { notFound } from 'next/navigation';

import { GuestResponseWorkspace } from '@/components/projects/guest-response-workspace';
import { WorkspacePage } from '@/components/workspace/workspace-page';
import { getOwnedProjectContextForRequest } from '@/modules/auth/dashboard-request-context';
import { getGuestbookInboxForVerifiedProject } from '@/modules/guestbook';
import { getRsvpAnalyticsForVerifiedProject } from '@/modules/guests/rsvp-analytics.service';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

type RsvpAnalyticsPageProps = {
  params: Promise<{ projectId: string }>;
  searchParams?: Promise<{ tab?: string | string[] }>;
};

type ResponseScreen = {
  guestbook: Awaited<ReturnType<typeof getGuestbookInboxForVerifiedProject>>;
  rsvp: Awaited<ReturnType<typeof getRsvpAnalyticsForVerifiedProject>>;
};

// Current response state is private owner data and must always load fresh.
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * Canonical owner response hub. It stays available before any personal invitation
 * is prepared so the truthful no-guest and no-response states can be monitored.
 */
async function getResponseScreenOrNotFound(projectId: string): Promise<ResponseScreen> {
  try {
    const project = await getOwnedProjectContextForRequest(projectId);
    const [rsvp, guestbook] = await Promise.all([
      getRsvpAnalyticsForVerifiedProject(project),
      getGuestbookInboxForVerifiedProject(project),
    ]);

    return { guestbook, rsvp };
  } catch (error) {
    if (error instanceof ProjectAccessDeniedError) {
      notFound();
    }

    throw error;
  }
}

export default async function RsvpAnalyticsPage({ params, searchParams }: RsvpAnalyticsPageProps) {
  const { projectId } = await params;
  const { tab } = await (searchParams ?? Promise.resolve<{ tab?: string | string[] }>({}));
  const screen = await getResponseScreenOrNotFound(projectId);

  return (
    <WorkspacePage kind="responses" width="operations">
      <GuestResponseWorkspace
        analytics={screen.rsvp.analytics}
        entries={screen.guestbook.entries}
        initialTab={tab === 'ucapan' ? 'guestbook' : 'responses'}
        projectId={screen.rsvp.project.id}
        timezone={screen.guestbook.project.defaultTimezone}
      />
    </WorkspacePage>
  );
}
