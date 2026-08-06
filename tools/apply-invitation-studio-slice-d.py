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
        raise RuntimeError(f"{label}: expected one match, found {count}")
    return content.replace(old, new, 1)


def regex_once(content: str, pattern: str, replacement: str, *, label: str) -> str:
    updated, count = re.subn(pattern, replacement, content, count=1, flags=re.DOTALL)
    if count != 1:
        raise RuntimeError(f"{label}: expected one regex match, found {count}")
    return updated


def update_provider() -> None:
    path = "src/components/projects/invitation-studio-provider.tsx"
    content = read(path)
    content = replace_once(
        content,
        """  submissionPayload: string;
  updateLocalContent: (action: InvitationEditorLocalAction) => void;
};
""",
        """  submissionPayload: string;
  synchronizeLocalContent: (action: InvitationEditorLocalAction) => void;
  updateLocalContent: (action: InvitationEditorLocalAction) => void;
};
""",
        label="provider context synchronize method",
    )
    content = replace_once(
        content,
        """  const updateLocalContent = useCallback((action: InvitationEditorLocalAction) => {
    dispatchLocalContent(action);
    setIsDirty(true);
  }, []);

  const submissionPayload""",
        """  const updateLocalContent = useCallback((action: InvitationEditorLocalAction) => {
    dispatchLocalContent(action);
    setIsDirty(true);
  }, []);
  const synchronizeLocalContent = useCallback((action: InvitationEditorLocalAction) => {
    dispatchLocalContent(action);
  }, []);

  const submissionPayload""",
        label="provider synchronize callback",
    )
    content = replace_once(
        content,
        """      savePresentation,
      submissionPayload,
      updateLocalContent,
""",
        """      savePresentation,
      submissionPayload,
      synchronizeLocalContent,
      updateLocalContent,
""",
        label="provider value synchronize",
    )
    content = replace_once(
        content,
        """      savePresentation,
      submissionPayload,
      updateLocalContent,
    ],
""",
        """      savePresentation,
      submissionPayload,
      synchronizeLocalContent,
      updateLocalContent,
    ],
""",
        label="provider dependencies synchronize",
    )
    write(path, content)


def update_local_state() -> None:
    path = "src/modules/invitations/invitation-editor-local-state.ts"
    content = read(path)
    content = replace_once(
        content,
        """  | {
      events: InvitationDraftContent['eventSchedule']['events'];
      type: 'schedule';
    }
  | {
      field: RsvpField;
""",
        """  | {
      events: InvitationDraftContent['eventSchedule']['events'];
      type: 'schedule';
    }
  | {
      enabled: boolean;
      type: 'gallery-visibility';
    }
  | {
      imageIds: string[];
      type: 'gallery-assets';
    }
  | {
      audio: InvitationDraftContent['audio'];
      type: 'audio-asset';
    }
  | {
      field: RsvpField;
""",
        label="local media actions",
    )
    content = replace_once(
        content,
        """    case 'schedule':
      return {
        ...content,
        eventSchedule: { events: action.events },
      };
    case 'rsvp':
""",
        """    case 'schedule':
      return {
        ...content,
        eventSchedule: { events: action.events },
      };
    case 'gallery-visibility':
      return {
        ...content,
        gallery: { ...content.gallery, enabled: action.enabled },
      };
    case 'gallery-assets':
      return {
        ...content,
        gallery: { ...content.gallery, imageIds: action.imageIds },
      };
    case 'audio-asset':
      return {
        ...content,
        audio: action.audio,
      };
    case 'rsvp':
""",
        label="local media reducer",
    )
    content = replace_once(
        content,
        """    hero: {
      eyebrow: content.hero.eyebrow,
      subtitle: content.hero.subtitle,
      title: content.hero.title,
    },
    opening: {
""",
        """    gallery: {
      enabled: content.gallery.enabled,
    },
    hero: {
      eyebrow: content.hero.eyebrow,
      subtitle: content.hero.subtitle,
      title: content.hero.title,
    },
    opening: {
""",
        label="gallery visibility submission",
    )
    write(path, content)


def update_editor_schema() -> None:
    path = "src/modules/invitations/invitation-editor.schema.ts"
    content = read(path)
    content = replace_once(
        content,
        """  'story.body',
  'rsvp.enabled',
""",
        """  'story.body',
  'gallery.enabled',
  'rsvp.enabled',
""",
        label="gallery form field",
    )
    content = replace_once(
        content,
        """        hero: z
          .object({
""",
        """        gallery: z
          .object({
            enabled: checkboxInputSchema,
          })
          .strict(),
        hero: z
          .object({
""",
        label="gallery editor schema",
    )
    content = replace_once(
        content,
        """      hero: {
        eyebrow: getFormValue(formData, 'hero.eyebrow'),
""",
        """      gallery: {
        enabled: getCheckboxValue(formData, 'gallery.enabled'),
      },
      hero: {
        eyebrow: getFormValue(formData, 'hero.eyebrow'),
""",
        label="legacy gallery parser",
    )
    content = content.replace(
        "Gallery, metadata, compatibility mirrors, snapshots, and injected\n * fields cannot cross either path.",
        "Gallery membership, metadata, compatibility mirrors, snapshots, and injected\n * fields cannot cross either path. Gallery visibility is the only gallery composition field accepted.",
        1,
    )
    write(path, content)


def update_editor_service() -> None:
    path = "src/modules/invitations/invitation-editor.service.ts"
    content = read(path)
    content = replace_once(
        content,
        """    // meta and gallery intentionally stay sourced from the verified active
    // draft. The editor has no controls for them, so client input cannot mutate
    // timezone, gallery membership, or schema-level metadata.
    meta: currentContent.meta,
    gallery: currentContent.gallery,
""",
        """    // Metadata and gallery membership stay sourced from the verified active
    // draft. The editor may change only whether the existing gallery composition
    // is shown; upload, removal, and ordering remain owner-only media operations.
    meta: currentContent.meta,
    gallery: {
      enabled: input.gallery.enabled,
      imageIds: currentContent.gallery.imageIds,
    },
""",
        label="gallery visibility service merge",
    )
    write(path, content)


def update_editor_gallery_panel() -> None:
    path = "src/components/projects/invitation-editor.tsx"
    content = read(path)
    replacement = """    case 'gallery':
      return (
        <InvitationWorkspacePanel active section=\"gallery\">
          <EditorSection
            description=\"Atur apakah foto yang sudah disiapkan di mode Media akan tampil dalam perjalanan undangan.\"
            number=\"06\"
            title=\"Galeri\"
          >
            <div className=\"space-y-5\">
              <EditorToggle
                checked={content.gallery.enabled}
                error={getError(fieldErrors, 'gallery.enabled')}
                help=\"Aset foto tetap aman ketika galeri disembunyikan. Tamu hanya melihat galeri setelah draf disimpan dan undangan diterbitkan.\"
                label=\"Tampilkan galeri foto\"
                name=\"gallery.enabled\"
                onToggle={(enabled) =>
                  updateLocalContent({ enabled, type: 'gallery-visibility' })
                }
              />
              <div className=\"border-seraya-border-default bg-seraya-surface rounded-[var(--seraya-radius-md)] border p-4 sm:p-5\">
                <p className=\"text-seraya-text-primary font-semibold\">
                  {content.gallery.imageIds.length > 0
                    ? `${content.gallery.imageIds.length} foto siap digunakan`
                    : 'Belum ada foto yang siap digunakan'}
                </p>
                <p className=\"text-seraya-text-muted mt-1.5 max-w-xl text-sm leading-6\">
                  Upload, urutan, penggantian, dan penghapusan aset dikelola di mode Media agar
                  proses file tidak bercampur dengan penyusunan isi undangan.
                </p>
                <Link
                  className=\"border-seraya-border-default bg-seraya-canvas text-seraya-text-primary hover:border-seraya-border-strong focus-visible:outline-seraya-focus-ring mt-4 inline-flex min-h-11 items-center justify-center rounded-[var(--seraya-radius-md)] border px-4 text-sm font-semibold focus-visible:outline-3 focus-visible:outline-offset-2\"
                  href={`/dashboard/${projectId}/invitation?mode=media`}
                  prefetch={false}
                >
                  Buka mode Media
                </Link>
              </div>
            </div>
          </EditorSection>
        </InvitationWorkspacePanel>
      );
    case 'rsvp':"""
    content = regex_once(
        content,
        r"    case 'gallery':[\s\S]*?    case 'rsvp':",
        replacement,
        label="content gallery composition panel",
    )
    write(path, content)


def update_gallery_manager() -> None:
    path = "src/components/projects/gallery-manager.tsx"
    content = read(path)
    content = replace_once(
        content,
        """type GalleryManagerProps = {
  initialImages: InvitationGalleryImage[];
  isPublished: boolean;
  projectId: string;
};
""",
        """type GalleryManagerProps = {
  embedded?: boolean;
  initialImages: InvitationGalleryImage[];
  isPublished: boolean;
  onImagesChange?: (images: InvitationGalleryImage[]) => void;
  projectId: string;
  showProjectBackLink?: boolean;
};
""",
        label="gallery manager props",
    )
    content = replace_once(
        content,
        """export function GalleryManager({ initialImages, isPublished, projectId }: GalleryManagerProps) {
""",
        """export function GalleryManager({
  embedded = false,
  initialImages,
  isPublished,
  onImagesChange,
  projectId,
  showProjectBackLink = true,
}: GalleryManagerProps) {
""",
        label="gallery manager signature",
    )
    content = replace_once(
        content,
        """  const [isRemovingId, setIsRemovingId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
""",
        """  const [isRemovingId, setIsRemovingId] = useState<string | null>(null);
  const [isReorderingId, setIsReorderingId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
""",
        label="gallery reorder state",
    )
    content = replace_once(
        content,
        """      setImages((current) => [...current, finalized.image as InvitationGalleryImage]);
      toast({ title: 'Foto sudah ditambahkan ke galeri.', variant: 'success' });
""",
        """      const nextImages = [...images, finalized.image as InvitationGalleryImage];
      setImages(nextImages);
      onImagesChange?.(nextImages);
      toast({ title: 'Foto sudah ditambahkan ke galeri.', variant: 'success' });
""",
        label="gallery upload callback",
    )
    content = replace_once(
        content,
        """      setImages((current) => current.filter((image) => image.id !== assetId));
      toast({ title: 'Foto dihapus dari galeri draft.', variant: 'success' });
""",
        """      const nextImages = images.filter((image) => image.id !== assetId);
      setImages(nextImages);
      onImagesChange?.(nextImages);
      toast({ title: 'Foto dihapus dari galeri draft.', variant: 'success' });
""",
        label="gallery remove callback",
    )
    content = replace_once(
        content,
        """  return (
    <Card aria-labelledby=\"gallery-manager-title\" className=\"max-w-4xl overflow-hidden\">
""",
        """  async function handleMove(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;

    if (isReorderingId || targetIndex < 0 || targetIndex >= images.length) {
      return;
    }

    const movedImage = images[index];
    if (!movedImage) {
      return;
    }

    const nextImages = [...images];
    [nextImages[index], nextImages[targetIndex]] = [nextImages[targetIndex]!, nextImages[index]!];
    setIsReorderingId(movedImage.id);
    setUploadMessage(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/gallery/reorder`, {
        body: JSON.stringify({ imageIds: nextImages.map((image) => image.id) }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const payload = await readJson<{ message?: string }>(response);

      if (!response.ok) {
        throw new Error(payload.message ?? 'Urutan foto belum dapat disimpan.');
      }

      setImages(nextImages);
      onImagesChange?.(nextImages);
      toast({ title: 'Urutan galeri diperbarui.', variant: 'success' });
    } catch (error) {
      setUploadMessage(
        error instanceof Error ? error.message : 'Urutan foto belum dapat disimpan.',
      );
    } finally {
      setIsReorderingId(null);
    }
  }

  return (
    <Card
      aria-labelledby=\"gallery-manager-title\"
      className={embedded ? 'w-full overflow-hidden' : 'max-w-4xl overflow-hidden'}
      data-invitation-studio-gallery-manager={embedded ? 'embedded' : 'standalone'}
    >
""",
        label="gallery reorder handler",
    )
    content = replace_once(
        content,
        """            {images.map((image) => (
              <li className=\"space-y-2\" key={image.id}>
""",
        """            {images.map((image, index) => (
              <li className=\"space-y-2\" data-gallery-image-id={image.id} key={image.id}>
""",
        label="gallery indexed rows",
    )
    content = replace_once(
        content,
        """                <Button
                  fullWidth
                  loading={isRemovingId === image.id}
""",
        """                <div className=\"grid grid-cols-2 gap-2\">
                  <Button
                    aria-label={`Naikkan foto ${index + 1}`}
                    disabled={index === 0 || isReorderingId !== null}
                    loading={isReorderingId === image.id}
                    onClick={() => handleMove(index, -1)}
                    size=\"sm\"
                    type=\"button\"
                    variant=\"secondary\"
                  >
                    Naikkan
                  </Button>
                  <Button
                    aria-label={`Turunkan foto ${index + 1}`}
                    disabled={index === images.length - 1 || isReorderingId !== null}
                    loading={isReorderingId === image.id}
                    onClick={() => handleMove(index, 1)}
                    size=\"sm\"
                    type=\"button\"
                    variant=\"secondary\"
                  >
                    Turunkan
                  </Button>
                </div>
                <Button
                  fullWidth
                  loading={isRemovingId === image.id}
""",
        label="gallery reorder controls",
    )
    content = replace_once(
        content,
        """        <div className=\"border-seraya-border-default border-t pt-5\">
          <Link
            className=\"text-seraya-action-primary focus-visible:outline-seraya-focus-ring rounded-[var(--seraya-radius-sm)] text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-3\"
            href={`/dashboard/${projectId}`}
          >
            ← Kembali ke project
          </Link>
        </div>
""",
        """        {showProjectBackLink ? (
          <div className=\"border-seraya-border-default border-t pt-5\">
            <Link
              className=\"text-seraya-action-primary focus-visible:outline-seraya-focus-ring rounded-[var(--seraya-radius-sm)] text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-3\"
              href={`/dashboard/${projectId}`}
            >
              ← Kembali ke project
            </Link>
          </div>
        ) : null}
""",
        label="gallery optional back link",
    )
    write(path, content)


def update_audio_manager() -> None:
    path = "src/components/projects/invitation-audio-manager.tsx"
    content = read(path)
    content = replace_once(
        content,
        """type InvitationAudioManagerProps = {
  initialAudio: InvitationAudioSummary | null;
  isPublished: boolean;
  projectId: string;
};
""",
        """type InvitationAudioManagerProps = {
  embedded?: boolean;
  initialAudio: InvitationAudioSummary | null;
  isPublished: boolean;
  onAudioChange?: (audio: InvitationAudioSummary | null) => void;
  projectId: string;
};
""",
        label="audio manager props",
    )
    content = replace_once(
        content,
        """export function InvitationAudioManager({
  initialAudio,
  isPublished,
  projectId,
}: InvitationAudioManagerProps) {
""",
        """export function InvitationAudioManager({
  embedded = false,
  initialAudio,
  isPublished,
  onAudioChange,
  projectId,
}: InvitationAudioManagerProps) {
""",
        label="audio manager signature",
    )
    content = replace_once(
        content,
        """      setAudio(finalized.audio);
      announceAudioChange({
""",
        """      setAudio(finalized.audio);
      onAudioChange?.(finalized.audio);
      announceAudioChange({
""",
        label="audio upload callback",
    )
    content = replace_once(
        content,
        """      setAudio(null);
      announceAudioChange({ durationSeconds: null, enabled: false });
""",
        """      setAudio(null);
      onAudioChange?.(null);
      announceAudioChange({ durationSeconds: null, enabled: false });
""",
        label="audio remove callback",
    )
    content = replace_once(
        content,
        """      className=\"mb-5 overflow-hidden sm:mb-6\"
      data-v4j-audio-foundation=\"slice-c\"
""",
        """      className={embedded ? 'w-full overflow-hidden' : 'mb-5 overflow-hidden sm:mb-6'}
      data-invitation-studio-audio-manager={embedded ? 'embedded' : 'standalone'}
      data-v4j-audio-foundation=\"slice-d\"
""",
        label="audio embedded card",
    )
    write(path, content)


def update_media_validation() -> None:
    path = "src/modules/media/media.validation.ts"
    content = read(path)
    content = replace_once(
        content,
        """  MAX_GALLERY_IMAGE_BYTES,
  SUPPORTED_GALLERY_IMAGE_MIME_TYPES,
""",
        """  MAX_GALLERY_IMAGE_BYTES,
  MAX_GALLERY_IMAGES,
  SUPPORTED_GALLERY_IMAGE_MIME_TYPES,
""",
        label="media max order import",
    )
    content = replace_once(
        content,
        """export const galleryMediaAssetIdSchema = z.string().uuid('Foto tidak valid.');
""",
        """export const galleryMediaAssetIdSchema = z.string().uuid('Foto tidak valid.');

export const galleryMediaOrderSchema = z
  .array(galleryMediaAssetIdSchema)
  .max(MAX_GALLERY_IMAGES, `Galeri undangan maksimal berisi ${MAX_GALLERY_IMAGES} foto.`)
  .refine((imageIds) => new Set(imageIds).size === imageIds.length, 'Urutan foto tidak valid.');
""",
        label="gallery order schema",
    )
    write(path, content)


def update_media_service() -> None:
    path = "src/modules/media/media.service.ts"
    content = read(path)
    content = replace_once(
        content,
        """export class MediaUploadUnavailableError extends Error {
  constructor() {
    super('The media upload is not available.');
    this.name = 'MediaUploadUnavailableError';
  }
}
""",
        """export class MediaUploadUnavailableError extends Error {
  constructor() {
    super('The media upload is not available.');
    this.name = 'MediaUploadUnavailableError';
  }
}

export class MediaGalleryOrderConflictError extends Error {
  constructor() {
    super('The gallery order no longer matches the active draft.');
    this.name = 'MediaGalleryOrderConflictError';
  }
}

export function isGalleryOrderPermutation(currentIds: string[], nextIds: string[]) {
  return (
    currentIds.length === nextIds.length &&
    new Set(nextIds).size === nextIds.length &&
    currentIds.every((id) => nextIds.includes(id))
  );
}
""",
        label="media order error and helper",
    )
    content = replace_once(
        content,
        """/** Owner-only private preview/gallery manager resolver. Missing or invalid IDs omit cleanly. */
export async function getPrivateGalleryImagesForVerifiedProject""",
        """/** Owner-only reorder. It accepts only an exact permutation of current draft IDs. */
export async function reorderGalleryImagesForCurrentUser(input: {
  imageIds: string[];
  projectId: string;
}): Promise<void> {
  const user = await requireCurrentUser();
  const project = await getOwnedProjectById(input.projectId, user.id);
  const draft = requireActiveDraft(await getActiveInvitationDraftForVerifiedProject(project));

  if (!isGalleryOrderPermutation(draft.content.gallery.imageIds, input.imageIds)) {
    throw new MediaGalleryOrderConflictError();
  }

  const content = invitationDraftContentSchema.parse({
    ...draft.content,
    gallery: {
      enabled: draft.content.gallery.enabled,
      imageIds: input.imageIds,
    },
  });

  await updateInvitationDraftGalleryForVerifiedProject({ content, project });
}

/** Owner-only private preview/gallery manager resolver. Missing or invalid IDs omit cleanly. */
export async function getPrivateGalleryImagesForVerifiedProject""",
        label="reorder gallery service",
    )
    write(path, content)


def update_invitation_page() -> None:
    path = "src/app/(dashboard)/dashboard/[projectId]/invitation/page.tsx"
    content = read(path)
    content = content.replace(
        "import { InvitationAudioManager } from '@/components/projects/invitation-audio-manager';\n",
        "",
        1,
    )
    content = replace_once(
        content,
        "import { InvitationStudioDesignMode } from '@/components/projects/invitation-studio-design-mode';\n",
        """import { InvitationStudioDesignMode } from '@/components/projects/invitation-studio-design-mode';
import { InvitationStudioMediaMode } from '@/components/projects/invitation-studio-media-mode';
""",
        label="media mode import",
    )
    content = replace_once(
        content,
        """    chapter === 'style'
      ? `/dashboard/${projectId}/invitation?mode=design`
      : `/dashboard/${projectId}/invitation?mode=content#bagian-${chapter}`
""",
        """    chapter === 'style'
      ? `/dashboard/${projectId}/invitation?mode=design`
      : chapter === 'gallery'
        ? `/dashboard/${projectId}/invitation?mode=media`
        : `/dashboard/${projectId}/invitation?mode=content#bagian-${chapter}`
""",
        label="gallery readiness handoff",
    )
    content = replace_once(
        content,
        """          initialMode={parseInvitationStudioMode(query.mode)}
          previewHref={`/dashboard/${screen.editor.project.id}/preview` as Route}
""",
        """          initialMode={parseInvitationStudioMode(query.mode)}
          media={
            <InvitationStudioMediaMode
              initialAudio={screen.audio}
              initialImages={screen.galleryImages}
              isPublished={screen.editor.project.status === 'published'}
              projectId={screen.editor.project.id}
            />
          }
          previewHref={`/dashboard/${screen.editor.project.id}/preview` as Route}
""",
        label="mount media mode",
    )
    content = regex_once(
        content,
        r"\n            <InvitationAudioManager[\s\S]*?\n            />",
        "",
        label="remove audio from content mode",
    )
    write(path, content)


def main() -> None:
    update_provider()
    update_local_state()
    update_editor_schema()
    update_editor_service()
    update_editor_gallery_panel()
    update_gallery_manager()
    update_audio_manager()
    update_media_validation()
    update_media_service()
    update_invitation_page()


if __name__ == '__main__':
    main()
