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
import { getPrivateGalleryImagesForVerifiedProject } from '@/modules/media/media.service';
import type { InvitationGalleryImage } from '@/modules/media/media.types';
import type { OwnedProject } from '@/modules/projects/project.repository';
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

async function getOptionalGalleryImages(input: {
  editor: OwnedInvitationEditor;
  project: OwnedProject;
  projectId: string;
}): Promise<InvitationGalleryImage[]> {
  try {
    return await getPrivateGalleryImagesForVerifiedProject({
      draftImageIds: input.editor.draft.content.gallery.imageIds,
      project: input.project,
    });
  } catch (error) {
    // Media stays optional in the local preview. Resolver failures omit the
    // gallery instead of exposing Storage details or weakening owner scope.
    console.error('Seraya editor live preview gallery resolution failed.', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
      projectId: input.projectId,
    });
    return [];
  }
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
        const [readiness, galleryImages] = await Promise.all([
          getInvitationReadinessForVerifiedProject(project, { draft: editor.draft }),
          getOptionalGalleryImages({ editor, project, projectId }),
        ]);

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
          readiness={screen.readiness}
        />
      </InvitationStudioShell>
    </WorkspacePage>
  );
}
