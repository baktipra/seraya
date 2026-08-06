import { DashboardShell } from '../../../../../src/components/dashboard/dashboard-shell';
import { parseInvitationWorkspaceTask } from '../../../../../src/components/projects/invitation-task-workspace.types';
import { createDefaultInvitationDraftContent } from '../../../../../src/modules/invitations/invitation-draft.defaults';
import type { InvitationDraft } from '../../../../../src/modules/invitations/invitation-draft.types';
import type { InvitationReadinessV1 } from '../../../../../src/modules/readiness';

import { OwnerWorkspaceUsabilityResetFixture } from './fixture-client';

type FixtureSearchParams = {
  mode?: string | string[];
  task?: string | string[];
};

export default async function OwnerWorkspaceUsabilityResetFixturePage({
  searchParams,
}: {
  searchParams?: Promise<FixtureSearchParams>;
}) {
  const query = await (searchParams ?? Promise.resolve<FixtureSearchParams>({}));
  const content = createDefaultInvitationDraftContent({
    default_timezone: 'Asia/Jakarta',
    event_date_primary: '2027-08-17',
    person_one_name: 'Alya Prameswari',
    person_two_name: 'Raka Mahendra',
  });
  const savedDraft: InvitationDraft = {
    content: {
      ...content,
      hero: {
        ...content.hero,
        title: 'Alya & Raka',
      },
      story: {
        ...content.story,
        enabled: false,
      },
    },
    created_at: '2026-08-07T00:00:00.000Z',
    deleted_at: null,
    id: 'usability-reset-draft',
    project_id: 'usability-reset-project',
    schema_version: 1,
    updated_at: '2026-08-07T00:00:00.000Z',
  };
  const readiness: InvitationReadinessV1 = {
    identity: {
      coupleLabel: 'Alya Prameswari & Raka Mahendra',
      templateKey: savedDraft.content.templateKey,
    },
    invitation: {
      hasPublishedSnapshot: false,
      hasUnpublishedChanges: false,
      hasVerifiedActivation: true,
      publishedSlug: null,
      state: 'draft_incomplete',
    },
  };

  return (
    <DashboardShell
      displayName="Alya Prameswari"
      email="alya@example.com"
      hasActiveProject
    >
      <OwnerWorkspaceUsabilityResetFixture
        initialTask={parseInvitationWorkspaceTask(query.task, query.mode)}
        readiness={readiness}
        savedDraft={savedDraft}
      />
    </DashboardShell>
  );
}
