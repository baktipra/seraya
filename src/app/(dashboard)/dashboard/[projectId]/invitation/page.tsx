import { notFound } from 'next/navigation';

import { InvitationStudioDesignMode } from '@/components/projects/invitation-studio-design-mode';
import { InvitationStudioMediaMode } from '@/components/projects/invitation-studio-media-mode';
import { InvitationStudioPreviewRail } from '@/components/projects/invitation-studio-preview-rail';
import { InvitationStudioPublishMode } from '@/components/projects/invitation-studio-publish-mode';
import { InvitationStudioProvider } from '@/components/projects/invitation-studio-provider';
import type { InvitationStudioStatusTone } from '@/components/projects/invitation-studio-shell';
import { InvitationTaskWorkspace } from '@/components/projects/invitation-task-workspace';
import {
  parseInvitationWorkspaceEditorialSection,
  parseInvitationWorkspaceTask,
} from '@/components/projects/invitation-task-workspace.types';
import { WorkspacePage } from '@/components/workspace/workspace-page';
import { measureWorkspaceServerLoad } from '@/lib/performance/workspace-performance.server';
import { getOwnedProjectContextForRequest } from '@/modules/auth/dashboard-request-context';
import {
  InvitationEditorDraftUnavailableError,
  getInvitationEditorForVerifiedProject,
  type OwnedInvitationEditor,
} from '@/modules/invitations/invitation-editor.service';
import { getInvitationAudioSummaryForVerifiedProject } from '@/modules/media/invitation-audio.service';
import type { InvitationAudioSummary } from '@/modules/media/invitation-audio.types';
import type { InvitationGalleryImage } from '@/modules/media/media.types';
import { getPaymentOverviewForVerifiedProject, type PaymentOverview } from '@/modules/payments';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';
import { getCurrentPublishedInvitationForVerifiedProject } from '@/modules/publications/publication.repository';
import type { PublishedInvitationSnapshot } from '@/modules/publications/publication.types';
import { getInvitationReadinessForVerifiedProject } from '@/modules/readiness';

type InvitationEditorSearchParams = {
  mode?: string | string[];
  section?: string | string[];
  surface?: string | string[];
  task?: string | string[];
  version?: string | string[];
  viewport?: string | string[];
};

type InvitationEditorPageProps = {
  params: Promise<{ projectId: string }>;
  searchParams?: Promise<InvitationEditorSearchParams>;
};

type InvitationEditorScreen = {
  audio: InvitationAudioSummary | null;
  editor: OwnedInvitationEditor;
  galleryImages: InvitationGalleryImage[];
  paymentOverview: PaymentOverview;
  publishedSnapshot: PublishedInvitationSnapshot | null;
  readiness: Awaited<ReturnType<typeof getInvitationReadinessForVerifiedProject>>;
};

type InvitationStudioStatus = {
  label: string;
  tone: InvitationStudioStatusTone;
};

// Invitation drafts are private owner data and must never participate in the
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

function getInvitationStudioStatus(
  readiness: InvitationEditorScreen['readiness'],
): InvitationStudioStatus {
  switch (readiness.invitation.state) {
    case 'published_with_unpublished_changes':
      return { label: 'Perubahan belum diterbitkan', tone: 'warning' };
    case 'published':
      return { label: 'Undangan aktif', tone: 'success' };
    case 'ready_to_publish':
      return { label: 'Siap diterbitkan', tone: 'brand' };
    case 'draft_ready_unactivated':
      return { label: 'Draf siap ditinjau', tone: 'neutral' };
    case 'draft_incomplete':
      return { label: 'Draf belum lengkap', tone: 'neutral' };
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
        const readiness = await getInvitationReadinessForVerifiedProject(project, {
          draft: editor.draft,
        });
        const [audio, paymentOverview, publishedSnapshot] = await Promise.all([
          getInvitationAudioSummaryForVerifiedProject({
            configuration: editor.draft.content.audio,
            project,
          }),
          getPaymentOverviewForVerifiedProject(project),
          getCurrentPublishedInvitationForVerifiedProject(project),
        ]);

        return {
          audio,
          editor,
          galleryImages: getDeferredGalleryImages(editor),
          paymentOverview,
          publishedSnapshot,
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

export default async function InvitationEditorPage({
  params,
  searchParams,
}: InvitationEditorPageProps) {
  const { projectId } = await params;
  const query = await (searchParams ?? Promise.resolve<InvitationEditorSearchParams>({}));
  const screen = await getInvitationEditorScreenOrNotFound(projectId);
  const workspaceStatus = getInvitationStudioStatus(screen.readiness);
  const initialTask = parseInvitationWorkspaceTask(query.task, query.mode);
  const initialSection = parseInvitationWorkspaceEditorialSection(
    query.section,
    query.task,
    query.mode,
  );

  return (
    <WorkspacePage kind="studio" width="studio">
      <InvitationStudioProvider
        initialDraft={screen.editor.draft}
        projectId={screen.editor.project.id}
      >
        <InvitationTaskWorkspace
          design={
            <InvitationStudioDesignMode
              galleryImages={screen.galleryImages}
              project={{
                event_date_primary: screen.editor.project.event_date_primary,
              }}
              projectId={screen.editor.project.id}
            />
          }
          draft={screen.editor.draft}
          gallery={
            <InvitationStudioMediaMode
              initialAudio={screen.audio}
              initialImages={screen.galleryImages}
              initialTab="gallery"
              isPublished={screen.editor.project.status === 'published'}
              key="editorial-gallery"
              projectId={screen.editor.project.id}
            />
          }
          initialSection={initialSection}
          initialTask={initialTask}
          music={
            <InvitationStudioMediaMode
              initialAudio={screen.audio}
              initialImages={screen.galleryImages}
              initialTab="audio"
              isPublished={screen.editor.project.status === 'published'}
              key="editorial-music"
              projectId={screen.editor.project.id}
            />
          }
          preview={
            <InvitationStudioPreviewRail
              project={{
                event_date_primary: screen.editor.project.event_date_primary,
                id: screen.editor.project.id,
              }}
              publicationState={screen.readiness.invitation.state}
              publishedSnapshot={screen.publishedSnapshot}
            />
          }
          projectId={screen.editor.project.id}
          publish={
            <InvitationStudioPublishMode
              draft={screen.editor.draft}
              paymentOverview={screen.paymentOverview}
              projectId={screen.editor.project.id}
              publishedSnapshot={screen.publishedSnapshot}
              readiness={screen.readiness}
            />
          }
          readiness={screen.readiness}
          statusLabel={workspaceStatus.label}
          statusTone={workspaceStatus.tone}
        />
      </InvitationStudioProvider>
    </WorkspacePage>
  );
}
