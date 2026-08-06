from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    (ROOT / path).write_text(content, encoding="utf-8")


def replace_once(content: str, old: str, new: str, *, label: str) -> str:
    count = content.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one match, found {count}")
    return content.replace(old, new, 1)


def update_preview_component_import() -> None:
    path = "src/components/projects/invitation-studio-preview-mode.tsx"
    content = read(path)
    content = replace_once(
        content,
        "import type { InvitationDraft, InvitationDraftContent } from '@/modules/invitations/invitation-draft.types';\n",
        """import type { InvitationDraftContent } from '@/modules/invitations/invitation-draft.schema';
import type { InvitationDraft } from '@/modules/invitations/invitation-draft.types';
""",
        label="preview draft imports",
    )
    write(path, content)


def update_invitation_page() -> None:
    path = "src/app/(dashboard)/dashboard/[projectId]/invitation/page.tsx"
    content = read(path)

    content = replace_once(
        content,
        "import { InvitationStudioMediaMode } from '@/components/projects/invitation-studio-media-mode';\n",
        """import { InvitationStudioMediaMode } from '@/components/projects/invitation-studio-media-mode';
import { InvitationStudioPreviewMode } from '@/components/projects/invitation-studio-preview-mode';
import {
  parseInvitationStudioPreviewSurface,
  parseInvitationStudioPreviewVersion,
  parseInvitationStudioPreviewViewport,
} from '@/components/projects/invitation-studio-preview.types';
""",
        label="preview imports",
    )
    content = replace_once(
        content,
        "import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';\n",
        """import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';
import { getCurrentPublishedInvitationForVerifiedProject } from '@/modules/publications/publication.repository';
import type { PublishedInvitationSnapshot } from '@/modules/publications/publication.types';
""",
        label="publication imports",
    )
    content = replace_once(
        content,
        """type InvitationEditorPageProps = {
  params: Promise<{ projectId: string }>;
  searchParams?: Promise<{ mode?: string | string[] }>;
};
""",
        """type InvitationEditorSearchParams = {
  mode?: string | string[];
  surface?: string | string[];
  version?: string | string[];
  viewport?: string | string[];
};

type InvitationEditorPageProps = {
  params: Promise<{ projectId: string }>;
  searchParams?: Promise<InvitationEditorSearchParams>;
};
""",
        label="page search params",
    )
    content = replace_once(
        content,
        """type InvitationEditorScreen = {
  audio: InvitationAudioSummary | null;
  editor: OwnedInvitationEditor;
  galleryImages: InvitationGalleryImage[];
  readiness: Awaited<ReturnType<typeof getInvitationReadinessForVerifiedProject>>;
};
""",
        """type InvitationEditorScreen = {
  audio: InvitationAudioSummary | null;
  editor: OwnedInvitationEditor;
  galleryImages: InvitationGalleryImage[];
  publishedSnapshot: PublishedInvitationSnapshot | null;
  readiness: Awaited<ReturnType<typeof getInvitationReadinessForVerifiedProject>>;
};
""",
        label="screen published snapshot",
    )
    content = replace_once(
        content,
        """        const audio = await getInvitationAudioSummaryForVerifiedProject({
          configuration: editor.draft.content.audio,
          project,
        });

        return {
          audio,
          editor,
          galleryImages: getDeferredGalleryImages(editor),
          readiness,
        };
""",
        """        const [audio, publishedSnapshot] = await Promise.all([
          getInvitationAudioSummaryForVerifiedProject({
            configuration: editor.draft.content.audio,
            project,
          }),
          getCurrentPublishedInvitationForVerifiedProject(project),
        ]);

        return {
          audio,
          editor,
          galleryImages: getDeferredGalleryImages(editor),
          publishedSnapshot,
          readiness,
        };
""",
        label="load published snapshot",
    )
    content = replace_once(
        content,
        """  const query = await (searchParams ?? Promise.resolve<{ mode?: string | string[] }>({}));
  const screen = await getInvitationEditorScreenOrNotFound(projectId);
  const studioStatus = getInvitationStudioStatus(screen.readiness);
""",
        """  const query = await (searchParams ?? Promise.resolve<InvitationEditorSearchParams>({}));
  const screen = await getInvitationEditorScreenOrNotFound(projectId);
  const studioStatus = getInvitationStudioStatus(screen.readiness);
  const initialPreviewVersion = parseInvitationStudioPreviewVersion(
    query.version,
    Boolean(screen.publishedSnapshot),
  );
  const initialPreviewSurface = parseInvitationStudioPreviewSurface(query.surface);
  const initialPreviewViewport = parseInvitationStudioPreviewViewport(query.viewport);
""",
        label="preview query state",
    )
    content = replace_once(
        content,
        """          previewHref={`/dashboard/${screen.editor.project.id}/preview` as Route}
          statusLabel={studioStatus.label}
""",
        """          preview={
            <InvitationStudioPreviewMode
              initialSurface={initialPreviewSurface}
              initialVersion={initialPreviewVersion}
              initialViewport={initialPreviewViewport}
              project={{
                event_date_primary: screen.editor.project.event_date_primary,
                id: screen.editor.project.id,
              }}
              publicationState={screen.readiness.invitation.state}
              publishedSnapshot={screen.publishedSnapshot}
              savedDraft={screen.editor.draft}
            />
          }
          statusLabel={studioStatus.label}
""",
        label="mount preview mode",
    )

    write(path, content)


def main() -> None:
    update_preview_component_import()
    update_invitation_page()


if __name__ == "__main__":
    main()
