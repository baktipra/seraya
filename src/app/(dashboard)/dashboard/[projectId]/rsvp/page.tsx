import { notFound } from 'next/navigation';

import { RsvpAnalyticsDashboard } from '@/components/projects/rsvp-analytics-dashboard';
import { getOwnedProjectContextForRequest } from '@/modules/auth/dashboard-request-context';
import { getRsvpAnalyticsForVerifiedProject } from '@/modules/guests/rsvp-analytics.service';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

type RsvpAnalyticsPageProps = {
  params: Promise<{ projectId: string }>;
};

// Current RSVP state is private owner data and must always load fresh.
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function RsvpAnalyticsPage({ params }: RsvpAnalyticsPageProps) {
  const { projectId } = await params;
  let summary: Awaited<ReturnType<typeof getRsvpAnalyticsForVerifiedProject>>;

  try {
    const project = await getOwnedProjectContextForRequest(projectId);
    summary = await getRsvpAnalyticsForVerifiedProject(project);
  } catch (error) {
    if (error instanceof ProjectAccessDeniedError) {
      notFound();
    }

    throw error;
  }

  return <RsvpAnalyticsDashboard analytics={summary.analytics} projectId={summary.project.id} />;
}
