import { notFound } from 'next/navigation';

import { CanonicalGuestFollowUpCenter } from '@/components/projects/canonical-guest-follow-up-center';
import { getOwnedProjectContextForRequest } from '@/modules/auth/dashboard-request-context';
import { prepareGuestFollowUpHandoffAction } from '@/modules/follow-up/follow-up.actions';
import { getGuestFollowUpCenterForVerifiedProject } from '@/modules/follow-up/follow-up.service';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

type GuestFollowUpPageProps = {
  params: Promise<{ projectId: string }>;
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

async function getFollowUpCenterOrNotFound(projectId: string) {
  try {
    const project = await getOwnedProjectContextForRequest(projectId);
    return getGuestFollowUpCenterForVerifiedProject(project);
  } catch (error) {
    if (error instanceof ProjectAccessDeniedError) {
      notFound();
    }

    throw error;
  }
}

export default async function GuestFollowUpPage({ params }: GuestFollowUpPageProps) {
  const { projectId } = await params;
  const center = await getFollowUpCenterOrNotFound(projectId);

  return (
    <CanonicalGuestFollowUpCenter
      isPublished={center.isPublished}
      projectId={center.project.id}
      rows={center.rows.map((row) => ({
        ...row,
        ...(row.eligibility.canPrepareEventReminder || row.eligibility.canPrepareRsvpReminder
          ? {
              handoffAction: prepareGuestFollowUpHandoffAction.bind(null, {
                guestId: row.guestId,
                projectId: center.project.id,
              }),
            }
          : {}),
      }))}
      summary={center.summary}
      timezone={center.project.default_timezone}
    />
  );
}
