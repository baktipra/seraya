from __future__ import annotations

import re
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


def regex_once(content: str, pattern: str, replacement: str, *, label: str) -> str:
    updated, count = re.subn(pattern, replacement, content, count=1, flags=re.DOTALL)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one regex match, found {count}")
    return updated


def update_workspace_navigation() -> None:
    path = "src/components/projects/invitation-editor-workspace.tsx"
    content = read(path)

    content = replace_once(
        content,
        """export const invitationStudioChapters = canonicalInvitationEditorSectionKeys.map((chapterKey) => {
  const chapter = invitationEditorSections.find((candidate) => candidate.key === chapterKey);

  if (!chapter) {
    throw new Error(`Unknown invitation studio chapter: ${chapterKey}`);
  }

  return chapter;
});
""",
        """export const invitationStudioChapters = canonicalInvitationEditorSectionKeys.map((chapterKey) => {
  const chapter = invitationEditorSections.find((candidate) => candidate.key === chapterKey);

  if (!chapter) {
    throw new Error(`Unknown invitation studio chapter: ${chapterKey}`);
  }

  return chapter;
});

export const invitationContentStudioChapters = invitationStudioChapters.filter(
  (chapter) => chapter.key !== 'style',
);
""",
        label="content chapter export",
    )

    start = content.index(
        "export const InvitationWorkspaceNavigation = memo(function InvitationWorkspaceNavigation({"
    )
    end = content.index("\nexport function InvitationWorkspacePanel", start)
    block = content[start:end]
    block = block.replace("invitationStudioChapters", "chapters")
    block = replace_once(
        block,
        """export const InvitationWorkspaceNavigation = memo(function InvitationWorkspaceNavigation({
  activeSection,
  onSelect,
  statuses,
}: {
  activeSection: InvitationEditorSectionKey;
  onSelect: (section: InvitationEditorSectionKey) => void;
  statuses: InvitationEditorSectionStatuses;
}) {
""",
        """export const InvitationWorkspaceNavigation = memo(function InvitationWorkspaceNavigation({
  activeSection,
  chapters = invitationContentStudioChapters,
  onSelect,
  statuses,
}: {
  activeSection: InvitationEditorSectionKey;
  chapters?: readonly (typeof invitationEditorSections)[number][];
  onSelect: (section: InvitationEditorSectionKey) => void;
  statuses: InvitationEditorSectionStatuses;
}) {
""",
        label="navigation chapters prop",
    )
    block = replace_once(
        block,
        "  const progress = getInvitationEditorProgress(statuses);\n",
        """  const progressValues = chapters.map((chapter) => statuses[chapter.key]);
  const progress = {
    error: progressValues.filter((status) => status === 'error').length,
    ready: progressValues.filter(
      (status) => status === 'complete' || status === 'optional_off',
    ).length,
    total: chapters.length,
  };
""",
        label="content progress",
    )
    block = replace_once(
        block,
        "<p className=\"text-seraya-text-primary mt-1 text-sm font-semibold\">9 bab perjalanan</p>",
        "<p className=\"text-seraya-text-primary mt-1 text-sm font-semibold\">{chapters.length} bab isi</p>",
        label="content chapter count",
    )
    content = content[:start] + block + content[end:]
    write(path, content)


def update_invitation_editor() -> None:
    path = "src/components/projects/invitation-editor.tsx"
    content = read(path)

    content = content.replace("import dynamic from 'next/dynamic';\n", "", 1)
    content = content.replace(
        "import type { InvitationRendererProjectMetadata } from '@/modules/invitation-templates/invitation-view-model';\n",
        "",
        1,
    )
    content = content.replace(
        """import {
  INVITATION_AUDIO_CHANGED_EVENT,
  type InvitationAudioChangedEventDetail,
} from '@/modules/media/invitation-audio-playback.types';
import type { InvitationAudioConfiguration } from '@/modules/media/invitation-audio.types';
import type { InvitationGalleryImage } from '@/modules/media/media.types';
""",
        "",
        1,
    )
    content = content.replace("  InvitationTemplatePicker,\n", "", 1)
    content = replace_once(
        content,
        """  getInvitationEditorSectionStatuses,
  invitationEditorSections,
""",
        """  getInvitationEditorSectionStatuses,
  invitationContentStudioChapters,
  invitationEditorSections,
""",
        label="content chapter import",
    )

    content = regex_once(
        content,
        r"\nconst fallbackProjectMetadata:[\s\S]*?\nexport type InvitationEditorProps",
        "\nexport type InvitationEditorProps",
        label="remove legacy preview declarations",
    )
    content = regex_once(
        content,
        r"export type InvitationEditorProps = \{[\s\S]*?\n\};",
        """export type InvitationEditorProps = {
  draft: InvitationDraft;
  projectId: string;
  readiness?: Pick<WeddingReadinessV1, 'identity' | 'invitation'>;
};""",
        label="editor props",
    )

    content = regex_once(
        content,
        r"    case 'style':[\s\S]*?    case 'opening':",
        "    case 'opening':",
        label="remove style panel from content editor",
    )
    content = replace_once(
        content,
        """export function InvitationEditor({
  draft,
  galleryImages = [],
  project = fallbackProjectMetadata,
  projectId,
  readiness,
}: InvitationEditorProps) {
""",
        """export function InvitationEditor({ draft, projectId, readiness }: InvitationEditorProps) {
""",
        label="editor signature",
    )
    content = regex_once(
        content,
        r"  const \[isLocalPreviewOpen,[\s\S]*?  const \[isEditorInteractive, setIsEditorInteractive\] = useState\(false\);",
        "  const [isEditorInteractive, setIsEditorInteractive] = useState(false);",
        label="remove preview state",
    )
    content = content.replace(
        "  const [activeSection, setActiveSection] = useState<InvitationEditorSectionKey>('style');",
        "  const [activeSection, setActiveSection] = useState<InvitationEditorSectionKey>('opening');",
        1,
    )
    content = replace_once(
        content,
        """  const errorSections = useMemo(
    () => getInvitationEditorErrorSections(state.fieldErrors),
    [state.fieldErrors],
  );
""",
        """  const errorSections = useMemo(
    () => getInvitationEditorErrorSections(state.fieldErrors).filter((section) => section !== 'style'),
    [state.fieldErrors],
  );
""",
        label="content error sections",
    )
    content = content.replace("  const shouldMountPreview = isLocalPreviewOpen || shouldMountDesktopPreview;\n\n", "", 1)
    content = regex_once(
        content,
        r"\n  const handleOpenLocalPreview = useCallback\([\s\S]*?\n  const handleSectionSelect",
        "\n  const handleSectionSelect",
        label="remove local preview opener",
    )
    content = replace_once(
        content,
        """    const sectionExists = invitationEditorSections.some(
      (section) => section.key === requestedSection,
    );
""",
        """    const sectionExists = invitationContentStudioChapters.some(
      (section) => section.key === requestedSection,
    );
""",
        label="content hash sections",
    )

    preview_effect_start = content.index("\n  useEffect(() => {\n    const desktopPreview")
    error_effect_start = content.index("\n  useEffect(() => {\n    if (state.status !== 'error')", preview_effect_start)
    content = content[:preview_effect_start] + content[error_effect_start:]

    content = replace_once(
        content,
        """    const firstErrorSection = getInvitationEditorErrorSections(state.fieldErrors)[0];

    const frame = window.requestAnimationFrame(() => {
      if (firstErrorSection) {
        setActiveSection(firstErrorSection);
      }
""",
        """    const firstErrorSection = getInvitationEditorErrorSections(state.fieldErrors).find(
      (section) => section !== 'style',
    );

    const frame = window.requestAnimationFrame(() => {
      if (firstErrorSection) {
        setActiveSection(firstErrorSection);
      }
""",
        label="content error focus",
    )
    content = replace_once(
        content,
        """                Template, detail pasangan, jadwal, lokasi, galeri, Amplop Digital, dan penutup
                semuanya dikelola di sini.
""",
        """                Detail pasangan, jadwal, lokasi, galeri, Amplop Digital, dan penutup
                dikelola di mode Isi. Template serta palet berada di mode Desain.
""",
        label="content description",
    )
    content = replace_once(
        content,
        """            className=\"grid max-w-full min-w-0 scroll-mt-24 gap-4 lg:grid-cols-[14.5rem_minmax(0,1fr)] lg:items-start xl:gap-6 2xl:grid-cols-[14.5rem_minmax(26rem,1fr)_minmax(21rem,24.5rem)]\"
""",
        """            className=\"grid max-w-full min-w-0 scroll-mt-24 gap-4 lg:grid-cols-[14.5rem_minmax(0,1fr)] lg:items-start xl:gap-6\"
""",
        label="content grid",
    )
    content = replace_once(
        content,
        """            <InvitationWorkspaceNavigation
              activeSection={activeSection}
              onSelect={handleSectionSelect}
              statuses={sectionStatuses}
            />
""",
        """            <InvitationWorkspaceNavigation
              activeSection={activeSection}
              chapters={invitationContentStudioChapters}
              onSelect={handleSectionSelect}
              statuses={sectionStatuses}
            />
""",
        label="content navigation chapters",
    )
    content = regex_once(
        content,
        r"""                  <div className=\"flex w-full flex-col gap-2 sm:w-auto sm:min-w-56\">[\s\S]*?                  </div>\n                </div>\n              </div>\n            </form>""",
        """                  <div className=\"w-full sm:w-auto sm:max-w-xs\">
                    <p className=\"border-seraya-border-default bg-seraya-canvas text-seraya-text-muted rounded-[var(--seraya-radius-md)] border px-3.5 py-3 text-center text-xs leading-5\">
                      Preview exact tersedia di mode Desain dan membaca perubahan lokal yang sama.
                    </p>
                  </div>
                </div>
              </div>
            </form>""",
        label="content local command bridge",
    )
    content = regex_once(
        content,
        r"\n            \{shouldMountPreview \? \([\s\S]*?\n            \)\}\n",
        "\n",
        label="remove legacy preview render",
    )

    write(path, content)


def update_invitation_page() -> None:
    path = "src/app/(dashboard)/dashboard/[projectId]/invitation/page.tsx"
    content = read(path)

    content = replace_once(
        content,
        "import { InvitationEditor } from '@/components/projects/invitation-editor';\n",
        """import { InvitationEditor } from '@/components/projects/invitation-editor';
import { InvitationStudioDesignMode } from '@/components/projects/invitation-studio-design-mode';
""",
        label="design mode import",
    )
    content = replace_once(
        content,
        """function InvitationReadinessHandoff({
""",
        """function getInvitationChapterHref(
  projectId: string,
  chapter: InvitationEditorSectionKey,
): Route {
  return (
    chapter === 'style'
      ? `/dashboard/${projectId}/invitation?mode=design`
      : `/dashboard/${projectId}/invitation?mode=content#bagian-${chapter}`
  ) as Route;
}

function InvitationReadinessHandoff({
""",
        label="readiness chapter href helper",
    )
    content = content.replace(
        "href={`/dashboard/${projectId}/invitation?focus=${firstBlocker.key}#bagian-${firstBlocker.key}`}",
        "href={getInvitationChapterHref(projectId, firstBlocker.key)}",
        1,
    )
    content = content.replace(
        "href={`/dashboard/${projectId}/invitation?focus=${chapter.key}#bagian-${chapter.key}`}",
        "href={getInvitationChapterHref(projectId, chapter.key)}",
        1,
    )
    content = replace_once(
        content,
        """        <InvitationStudioShell
          coupleLabel={screen.readiness.identity.coupleLabel}
          initialMode={parseInvitationStudioMode(query.mode)}
""",
        """        <InvitationStudioShell
          coupleLabel={screen.readiness.identity.coupleLabel}
          design={
            <InvitationStudioDesignMode
              galleryImages={screen.galleryImages}
              project={{
                event_date_primary: screen.editor.project.event_date_primary,
              }}
              projectId={screen.editor.project.id}
            />
          }
          initialMode={parseInvitationStudioMode(query.mode)}
""",
        label="mount design mode",
    )
    content = replace_once(
        content,
        """            <InvitationEditor
              draft={screen.editor.draft}
              galleryImages={screen.galleryImages}
              project={{
                event_date_primary: screen.editor.project.event_date_primary,
              }}
              projectId={screen.editor.project.id}
              readiness={screen.readiness}
            />
""",
        """            <InvitationEditor
              draft={screen.editor.draft}
              projectId={screen.editor.project.id}
              readiness={screen.readiness}
            />
""",
        label="remove content preview props",
    )

    write(path, content)


def main() -> None:
    update_workspace_navigation()
    update_invitation_editor()
    update_invitation_page()


if __name__ == "__main__":
    main()
