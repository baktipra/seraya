from pathlib import Path

root = Path(__file__).resolve().parents[1]

preview_path = root / 'src/components/projects/invitation-studio-preview-mode.tsx'
preview = preview_path.read_text(encoding='utf-8')
old_preview = """  const selectedProject = {
    event_date_primary:
      version === 'published' && publishedSnapshot
        ? publishedSnapshot.snapshot.project.eventDatePrimary
        : project.event_date_primary,
  };
  const galleryImages = useMemo(
    () => getPreviewGalleryImages(selectedContent, version),
    [selectedContent, version],
  );
  const invitation = useMemo(
    () =>
      createInvitationEditorPreviewViewModel({
        content: selectedContent,
        galleryImages,
        project: selectedProject,
      }),
    [galleryImages, selectedContent, selectedProject.event_date_primary],
  );
"""
new_preview = """  const selectedEventDatePrimary =
    version === 'published' && publishedSnapshot
      ? publishedSnapshot.snapshot.project.eventDatePrimary
      : project.event_date_primary;
  const galleryImages = useMemo(
    () => getPreviewGalleryImages(selectedContent, version),
    [selectedContent, version],
  );
  const invitation = useMemo(
    () =>
      createInvitationEditorPreviewViewModel({
        content: selectedContent,
        galleryImages,
        project: { event_date_primary: selectedEventDatePrimary },
      }),
    [galleryImages, selectedContent, selectedEventDatePrimary],
  );
"""
if old_preview not in preview:
    raise SystemExit('preview memo repair target missing')
preview_path.write_text(preview.replace(old_preview, new_preview, 1), encoding='utf-8')

test_path = root / 'src/modules/publications/__tests__/published-invitation.schema.test.ts'
test = test_path.read_text(encoding='utf-8')
old_import = "import { createDefaultInvitationDraftContent } from '@/modules/invitations/invitation-draft.defaults';\n"
new_import = """import { resolveInvitationThemePaletteKey } from '@/modules/invitation-templates/core/theme-package.registry';
import { createDefaultInvitationDraftContent } from '@/modules/invitations/invitation-draft.defaults';
"""
if old_import not in test:
    raise SystemExit('publication test import target missing')
test = test.replace(old_import, new_import, 1)
old_draft = "draft: { ...createPayload().draft, templateKey: templateId },"
new_draft = """draft: {
              ...createPayload().draft,
              paletteKey: resolveInvitationThemePaletteKey(templateId, undefined),
              templateKey: templateId,
            },"""
if old_draft not in test:
    raise SystemExit('publication test template target missing')
test_path.write_text(test.replace(old_draft, new_draft, 1), encoding='utf-8')
