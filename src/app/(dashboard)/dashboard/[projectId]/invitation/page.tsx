import { notFound } from 'next/navigation';

import { InvitationEditor } from '@/components/projects/invitation-editor';
import { InvitationStudioShell } from '@/components/projects/invitation-studio-shell';
import { WorkspacePage } from '@/components/workspace/workspace-page';
import { measureWorkspaceServerLoad } from '@/lib/performance/workspace-performance.server';
import { getOwnedProjectContextForRequest } from '@/modules/auth/dashboard-request-context';
import {
  InvitationEditorDraftUnavailableError,
  getInvitationEditorForVerifiedProject,
} from '@/modules/invitations/invitation-editor.service';
import { getPrivateGalleryImagesForVerifiedProject } from '@/modules/media/media.service';
import type { InvitationGalleryImage } from '@/modules/media/media.types';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';
import { getWeddingReadinessForRequest } from '@/modules/readiness';

type InvitationEditorPageProps = {
  params: Promise<{ projectId: string }>;
};

type InvitationEditorScreen = {
  editor: Awaited<ReturnType<typeof getInvitationEditorForVerifiedProject>>;
  galleryImages: InvitationGalleryImage[];
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
  return measureWorkspaceServerLoad(
    {
      operation: 'invitation-editor-screen',
      workspace: 'studio',
    },
    async () => {
      try {
        const project = await getOwnedProjectContextForRequest(projectId);
        const [editor, readiness] = await Promise.all([
          getInvitationEditorForVerifiedProject(project),
          getWeddingReadinessForRequest(projectId),
        ]);

        let galleryImages: InvitationGalleryImage[] = [];

        try {
          galleryImages = await getPrivateGalleryImagesForVerifiedProject({
            draftImageIds: editor.draft.content.gallery.imageIds,
            project: editor.project,
          });
        } catch (error) {
          // Media stays optional in the local preview. Resolver failures omit the
          // gallery instead of exposing Storage details or weakening owner scope.
          console.error('Seraya editor live preview gallery resolution failed.', {
            errorName: error instanceof Error ? error.name : 'UnknownError',
            projectId,
          });
        }

        return { editor, galleryImages, readiness };
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
          readiness={{
            identity: screen.readiness.identity,
            invitation: screen.readiness.invitation,
          }}
        />
      </InvitationStudioShell>
    </WorkspacePage>
  );
}
