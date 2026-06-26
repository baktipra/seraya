import { notFound } from 'next/navigation';

import { ResponseUnavailableState } from '@/components/projects/response-unavailable-state';
import { RsvpAnalyticsDashboard } from '@/components/projects/rsvp-analytics-dashboard';
import { getOwnedProjectContextForRequest } from '@/modules/auth/dashboard-request-context';
import { getRsvpAnalyticsForVerifiedProject } from '@/modules/guests/rsvp-analytics.service';
import { getWeddingReadinessForRequest } from '@/modules/readiness';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

type RsvpAnalyticsPageProps = {
  params: Promise<{ projectId: string }>;
};

type RsvpScreen =
  | { kind: 'unavailable'; showDeliveryAction: boolean }
  | { kind: 'analytics'; summary: Awaited<ReturnType<typeof getRsvpAnalyticsForVerifiedProject>> };

// Current RSVP state is private owner data and must always load fresh.
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

async function getRsvpScreenOrNotFound(projectId: string): Promise<RsvpScreen> {
  try {
    const readiness = await getWeddingReadinessForRequest(projectId);

    if (!readiness.responses.hasActivePersonalLinks) {
      return {
        kind: 'unavailable',
        showDeliveryAction: readiness.invitation.hasPublishedSnapshot,
      };
    }

    const project = await getOwnedProjectContextForRequest(projectId);
    const summary = await getRsvpAnalyticsForVerifiedProject(project);

    return { kind: 'analytics', summary };
  } catch (error) {
    if (error instanceof ProjectAccessDeniedError) {
      notFound();
    }

    throw error;
  }
}

export default async function RsvpAnalyticsPage({ params }: RsvpAnalyticsPageProps) {
  const { projectId } = await params;
  const screen = await getRsvpScreenOrNotFound(projectId);

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
    <RsvpAnalyticsDashboard
      analytics={screen.summary.analytics}
      projectId={screen.summary.project.id}
    />
  );
}
