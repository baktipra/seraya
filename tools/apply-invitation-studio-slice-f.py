from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / 'src/app/(dashboard)/dashboard/[projectId]/invitation/page.tsx'
content = PATH.read_text(encoding='utf-8')


def replace_once(old: str, new: str, label: str) -> None:
    global content
    count = content.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected 1 match, found {count}')
    content = content.replace(old, new, 1)


replace_once("import Link from 'next/link';\n", '', 'remove Link import')
replace_once(
    "import { InvitationStudioPreviewMode } from '@/components/projects/invitation-studio-preview-mode';\n",
    "import { InvitationStudioPreviewMode } from '@/components/projects/invitation-studio-preview-mode';\nimport { InvitationStudioPublishMode } from '@/components/projects/invitation-studio-publish-mode';\n",
    'publish mode import',
)
replace_once(
    """import {
  getInvitationEditorSectionStatuses,
  invitationEditorSections,
  type InvitationEditorSectionKey,
  type InvitationEditorSectionStatus,
} from '@/components/projects/invitation-editor-workspace';
""",
    '',
    'remove readiness workspace imports',
)
replace_once(
    "import { getInvitationAudioSummaryForVerifiedProject } from '@/modules/media/invitation-audio.service';\n",
    "import { getInvitationAudioSummaryForVerifiedProject } from '@/modules/media/invitation-audio.service';\nimport { getPaymentOverviewForVerifiedProject, type PaymentOverview } from '@/modules/payments';\n",
    'payment imports',
)
replace_once(
    """  galleryImages: InvitationGalleryImage[];
  publishedSnapshot: PublishedInvitationSnapshot | null;
""",
    """  galleryImages: InvitationGalleryImage[];
  paymentOverview: PaymentOverview;
  publishedSnapshot: PublishedInvitationSnapshot | null;
""",
    'screen payment overview',
)

content, count = re.subn(
    r"\ntype InvitationReadinessHandoffProps = \{[\s\S]*?\nasync function getInvitationEditorScreenOrNotFound\(",
    "\nasync function getInvitationEditorScreenOrNotFound(",
    content,
    count=1,
)
if count != 1:
    raise RuntimeError(f'remove legacy readiness handoff: expected 1 match, found {count}')

replace_once(
    """        const [audio, publishedSnapshot] = await Promise.all([
          getInvitationAudioSummaryForVerifiedProject({
            configuration: editor.draft.content.audio,
            project,
          }),
          getCurrentPublishedInvitationForVerifiedProject(project),
        ]);
""",
    """        const [audio, paymentOverview, publishedSnapshot] = await Promise.all([
          getInvitationAudioSummaryForVerifiedProject({
            configuration: editor.draft.content.audio,
            project,
          }),
          getPaymentOverviewForVerifiedProject(project),
          getCurrentPublishedInvitationForVerifiedProject(project),
        ]);
""",
    'screen loaders',
)
replace_once(
    """          galleryImages: getDeferredGalleryImages(editor),
          publishedSnapshot,
""",
    """          galleryImages: getDeferredGalleryImages(editor),
          paymentOverview,
          publishedSnapshot,
""",
    'screen result',
)
replace_once(
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
          publish={
            <InvitationStudioPublishMode
              draft={screen.editor.draft}
              paymentOverview={screen.paymentOverview}
              projectId={screen.editor.project.id}
              publishedSnapshot={screen.publishedSnapshot}
              readiness={screen.readiness}
            />
          }
          statusLabel={studioStatus.label}
""",
    'mount publish mode',
)
replace_once(
    """          <div className="grid min-w-0 gap-5 sm:gap-6" data-invitation-studio-legacy-content>
            <InvitationReadinessHandoff
              draft={screen.editor.draft}
              projectId={screen.editor.project.id}
              readiness={screen.readiness}
            />
            <InvitationEditor
""",
    """          <div className="grid min-w-0 gap-5 sm:gap-6" data-invitation-studio-content-mode>
            <InvitationEditor
""",
    'remove readiness from content mode',
)

PATH.write_text(content, encoding='utf-8')
