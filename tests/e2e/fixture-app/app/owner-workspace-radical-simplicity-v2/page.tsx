import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { ProjectNavigation } from '@/components/dashboard/project-navigation';
import { ProjectOverviewBootstrap } from '@/components/projects/project-overview-bootstrap';
import { parseInvitationWorkspaceTask } from '@/components/projects/invitation-task-workspace.types';
import { createDefaultInvitationDraftContent } from '@/modules/invitations/invitation-draft.defaults';
import type { InvitationDraft } from '@/modules/invitations/invitation-draft.types';
import type {
  InvitationReadinessV1,
  WeddingReadinessV1,
} from '@/modules/readiness/wedding-readiness.types';

import { OwnerWorkspaceUsabilityResetFixture } from '../owner-workspace-usability-reset/fixture-client';

const projectId = 'editorial-v3';

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

function createInvitationFixtureState() {
  const content = createDefaultInvitationDraftContent({
    default_timezone: 'Asia/Jakarta',
    event_date_primary: '2027-10-18',
    person_one_name: 'Nadia Rahma',
    person_two_name: 'Farhan Akbar',
  });
  const savedDraft: InvitationDraft = {
    content: {
      ...content,
      hero: {
        ...content.hero,
        title: 'Nadia & Farhan',
      },
      story: {
        ...content.story,
        enabled: false,
      },
    },
    created_at: '2026-08-07T00:00:00.000Z',
    deleted_at: null,
    id: 'editorial-dashboard-v3-draft',
    project_id: projectId,
    schema_version: 1,
    updated_at: '2026-08-07T00:00:00.000Z',
  };
  const invitationReadiness: InvitationReadinessV1 = {
    identity: readiness.identity,
    invitation: readiness.invitation,
  };

  return { invitationReadiness, savedDraft };
}

type EditorialDashboardFixturePageProps = {
  searchParams: Promise<{
    mode?: string | string[];
    task?: string | string[];
    view?: string;
  }>;
};

export default async function EditorialDashboardFixturePage({
  searchParams,
}: EditorialDashboardFixturePageProps) {
  const query = await searchParams;
  const { invitationReadiness, savedDraft } = createInvitationFixtureState();

  return (
    <DashboardShell displayName="Bakti" email="bakti@example.com" hasActiveProject>
      <div className="min-w-0" data-dashboard-width="wide" data-project-workspace-shell>
        <ProjectNavigation
          coupleLabel={readiness.identity.coupleLabel}
          projectId={projectId}
          statusLabel="Draf belum lengkap"
        />
        <div className="min-w-0" data-project-workspace-main>
          {query.view === 'invitation' ? (
            <OwnerWorkspaceUsabilityResetFixture
              initialTask={parseInvitationWorkspaceTask(query.task, query.mode)}
              readiness={invitationReadiness}
              savedDraft={savedDraft}
            />
          ) : (
            <ProjectOverviewBootstrap projectId={projectId} readiness={readiness} />
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
