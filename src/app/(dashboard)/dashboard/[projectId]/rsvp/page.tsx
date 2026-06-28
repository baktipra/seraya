import { notFound } from 'next/navigation';

import { GuestResponseWorkspace } from '@/components/projects/guest-response-workspace';
import { ResponseUnavailableState } from '@/components/projects/response-unavailable-state';
import { getOwnedProjectContextForRequest } from '@/modules/auth/dashboard-request-context';
import { getGuestbookInboxForVerifiedProject } from '@/modules/guestbook';
import { getRsvpAnalyticsForVerifiedProject } from '@/modules/guests/rsvp-analytics.service';
import { getWeddingReadinessForRequest } from '@/modules/readiness';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

type RsvpAnalyticsPageProps = {
  params: Promise<{ projectId: string }>;
  searchParams?: Promise<{ tab?: string | string[] }>;
};

type ResponseScreen =
  | { kind: 'unavailable'; showDeliveryAction: boolean }
  | {
      kind: 'responses';
      guestbook: Awaited<ReturnType<typeof getGuestbookInboxForVerifiedProject>>;
      rsvp: Awaited<ReturnType<typeof getRsvpAnalyticsForVerifiedProject>>;
    };

// Current response state is private owner data and must always load fresh.
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

async function getResponseScreenOrNotFound(projectId: string): Promise<ResponseScreen> {
  try {
    const readiness = await getWeddingReadinessForRequest(projectId);

    if (!readiness.responses.hasActivePersonalLinks) {
      return {
        kind: 'unavailable',
        showDeliveryAction: readiness.invitation.hasPublishedSnapshot,
      };
    }

    const project = await getOwnedProjectContextForRequest(projectId);
    const [rsvp, guestbook] = await Promise.all([
      getRsvpAnalyticsForVerifiedProject(project),
      getGuestbookInboxForVerifiedProject(project),
    ]);

    return { guestbook, kind: 'responses', rsvp };
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

  if (screen.kind === 'unavailable') {
    return (
      <ResponseUnavailableState
        kind="rsvp"
        projectId={projectId}
        showDeliveryAction={screen.showDeliveryAction}
      />
    );
  }

  return (
    <GuestResponseWorkspace
      analytics={screen.rsvp.analytics}
      entries={screen.guestbook.entries}
      initialTab={tab === 'ucapan' ? 'guestbook' : 'responses'}
      projectId={screen.rsvp.project.id}
      timezone={screen.guestbook.project.defaultTimezone}
    />
  );
}
