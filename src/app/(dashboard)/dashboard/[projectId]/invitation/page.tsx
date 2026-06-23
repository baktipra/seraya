import { notFound } from 'next/navigation';

import { InvitationEditor } from '@/components/projects/invitation-editor';
import {
  InvitationEditorDraftUnavailableError,
  getInvitationEditorForCurrentUser,
} from '@/modules/invitations/invitation-editor.service';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

type InvitationEditorPageProps = {
  params: Promise<{ projectId: string }>;
};

// Invitation drafts are private owner data and must not participate in the
// public invitation snapshot cache.
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function InvitationEditorPage({ params }: InvitationEditorPageProps) {
  const { projectId } = await params;
  let editor: Awaited<ReturnType<typeof getInvitationEditorForCurrentUser>>;

  try {
    editor = await getInvitationEditorForCurrentUser(projectId);
  } catch (error) {
    if (
      error instanceof ProjectAccessDeniedError ||
      error instanceof InvitationEditorDraftUnavailableError
    ) {
      notFound();
    }

    throw error;
  }

  return <InvitationEditor draft={editor.draft} projectId={editor.project.id} />;
}
