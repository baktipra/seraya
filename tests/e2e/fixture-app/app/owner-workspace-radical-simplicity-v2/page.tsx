import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { ProjectOverviewBootstrap } from '@/components/projects/project-overview-bootstrap';
import type { WeddingReadinessV1 } from '@/modules/readiness/wedding-readiness.types';

import { OwnerWorkspaceUsabilityResetFixture } from '../owner-workspace-usability-reset/fixture-client';

const projectId = 'owner-workspace-radical-simplicity-v2-fixture';

const readiness: WeddingReadinessV1 = {
  identity: {
    coupleLabel: 'Nadia & Farhan',
    templateKey: 'roselle',
  },
  invitation: {
    hasPublishedSnapshot: false,
    hasUnpublishedChanges: true,
    hasVerifiedActivation: true,
    publishedSlug: null,
    state: 'draft_incomplete',
  },
  guests: {
    activeGuestCount: 36,
    activePersonalLinkGuestCount: 24,
    guestsWithoutActivePersonalLinkCount: 12,
    whatsappAvailableCount: 30,
    whatsappUnavailableCount: 6,
    readyToDistributeCount: 24,
    noPersonalInvitationCount: 12,
    needsLinkUpdateCount: 0,
    needsWhatsAppCount: 6,
  },
  primaryAction: {
    href: `/dashboard/${projectId}/invitation`,
    key: 'complete_invitation',
  },
  responses: {
    activeGuestbookCount: 8,
    attendingCount: 12,
    confirmedAttendeeCount: 25,
    declinedCount: 2,
    hasActivePersonalLinks: true,
    nonPendingRsvpCount: 14,
  },
};

type RadicalSimplicityFixturePageProps = {
  searchParams: Promise<{ view?: string }>;
};

export default async function RadicalSimplicityFixturePage({
  searchParams,
}: RadicalSimplicityFixturePageProps) {
  const { view } = await searchParams;

  return (
    <DashboardShell displayName="Bakti" email="bakti@example.com" hasActiveProject>
      {view === 'invitation' ? (
        <OwnerWorkspaceUsabilityResetFixture />
      ) : (
        <ProjectOverviewBootstrap projectId={projectId} readiness={readiness} />
      )}
    </DashboardShell>
  );
}
