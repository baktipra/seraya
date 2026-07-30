import { notFound } from 'next/navigation';

import { InvitationEditor } from '@/components/projects/invitation-editor';
import { InvitationStudioShell } from '@/components/projects/invitation-studio-shell';
import { WorkspacePage } from '@/components/workspace/workspace-page';
import { measureWorkspaceServerLoad } from '@/lib/performance/workspace-performance.server';
import { getOwnedProjectContextForRequest } from '@/modules/auth/dashboard-request-context';
import {
  InvitationEditorDraftUnavailableError,
  getInvitationEditorForVerifiedProject,
  type OwnedInvitationEditor,
} from '@/modules/invitations/invitation-editor.service';
import type { InvitationGalleryImage } from '@/modules/media/media.types';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';
import { getInvitationReadinessForVerifiedProject } from '@/modules/readiness';

type InvitationEditorPageProps = {
  params: Promise<{ projectId: string }>;
};

type InvitationEditorScreen = {
  editor: OwnedInvitationEditor;
  galleryImages: InvitationGalleryImage[];
  readiness: Awaited<ReturnType<typeof getInvitationReadinessForVerifiedProject>>;
};

// Invitation drafts are private owner data and must not participate in the
// public invitation snapshot cache.
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

function getDeferredGalleryImages(editor: OwnedInvitationEditor): InvitationGalleryImage[] {
  return editor.draft.content.gallery.imageIds.map((id, index) => ({
    alt: `Foto pasangan ${index + 1}`,
    id,
    src: `/dashboard/media/${id}`,
  }));
}

async function getInvitationEditorScreenOrNotFound(
  projectId: string,
): Promise<InvitationEditorScreen> {
  return measureWorkspaceServerLoad(
    {
      operation: 'invitation-editor-screen',
      workspace: 'studio',
    },
    async () => {
      try {
        const project = await getOwnedProjectContextForRequest(projectId);
        const editor = await getInvitationEditorForVerifiedProject(project);
        const readiness = await getInvitationReadinessForVerifiedProject(project, {
          draft: editor.draft,
        });

        return {
          editor,
          galleryImages: getDeferredGalleryImages(editor),
          readiness,
        };
      } catch (error) {
        if (
          error instanceof ProjectAccessDeniedError ||
          error instanceof InvitationEditorDraftUnavailableError
        ) {
          notFound();
        }

        throw error;
      }
    },
  );
}

export default async function InvitationEditorPage({ params }: InvitationEditorPageProps) {
  const { projectId } = await params;
  const screen = await getInvitationEditorScreenOrNotFound(projectId);

  return (
    <WorkspacePage kind="studio" width="studio">
      <InvitationStudioShell>
        <InvitationEditor
          draft={screen.editor.draft}
          galleryImages={screen.galleryImages}
          project={{
            event_date_primary: screen.editor.project.event_date_primary,
          }}
          projectId={screen.editor.project.id}
          readiness={screen.readiness}
        />
      </InvitationStudioShell>
    </WorkspacePage>
  );
}
