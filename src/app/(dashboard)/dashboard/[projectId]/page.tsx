import { notFound } from 'next/navigation';

import { ProjectOverviewBootstrap } from '@/components/projects/project-overview-bootstrap';
import {
  getOwnedProjectInvitationOverview,
  type OwnedProjectInvitationOverview,
} from '@/modules/invitations/invitation-draft.service';
import { getPaymentOverviewForVerifiedProject } from '@/modules/payments/payment.service';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

type ProjectDashboardPageProps = {
  params: Promise<{ projectId: string }>;
};

export const dynamic = 'force-dynamic';

export default async function ProjectDashboardPage({ params }: ProjectDashboardPageProps) {
  const { projectId } = await params;
  let overview: OwnedProjectInvitationOverview;

  try {
    overview = await getOwnedProjectInvitationOverview(projectId);
  } catch (error) {
    if (error instanceof ProjectAccessDeniedError) {
      notFound();
    }

    throw error;
  }

  const paymentOverview = await getPaymentOverviewForVerifiedProject(overview.project);

  return (
    <ProjectOverviewBootstrap
      draft={overview.draft}
      guestCount={overview.guestCount}
      paymentOverview={paymentOverview}
      publication={overview.publication}
      project={overview.project}
    />
  );
}
