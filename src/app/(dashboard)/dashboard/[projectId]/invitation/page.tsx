import { notFound } from 'next/navigation';

import { InvitationEditor } from '@/components/projects/invitation-editor';
import { getOwnedProjectContextForRequest } from '@/modules/auth/dashboard-request-context';
import {
  InvitationEditorDraftUnavailableError,
  getInvitationEditorForVerifiedProject,
} from '@/modules/invitations/invitation-editor.service';
import { getWeddingReadinessForRequest } from '@/modules/readiness';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

type InvitationEditorPageProps = {
  params: Promise<{ projectId: string }>;
};

type InvitationEditorScreen = {
  editor: Awaited<ReturnType<typeof getInvitationEditorForVerifiedProject>>;
  readiness: Awaited<ReturnType<typeof getWeddingReadinessForRequest>>;
};

// Invitation drafts are private owner data and must not participate in the
// public invitation snapshot cache.
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

async function getInvitationEditorScreenOrNotFound(
  projectId: string,
): Promise<InvitationEditorScreen> {
  try {
    const project = await getOwnedProjectContextForRequest(projectId);
    const [editor, readiness] = await Promise.all([
      getInvitationEditorForVerifiedProject(project),
      getWeddingReadinessForRequest(projectId),
    ]);

    return { editor, readiness };
  } catch (error) {
    if (
      error instanceof ProjectAccessDeniedError ||
      error instanceof InvitationEditorDraftUnavailableError
    ) {
      notFound();
    }

    throw error;
  }
}

export default async function InvitationEditorPage({ params }: InvitationEditorPageProps) {
  const { projectId } = await params;
  const screen = await getInvitationEditorScreenOrNotFound(projectId);

  return (
    <InvitationEditor
      draft={screen.editor.draft}
      projectId={screen.editor.project.id}
      readiness={{
        identity: screen.readiness.identity,
        invitation: screen.readiness.invitation,
      }}
    />
  );
}
