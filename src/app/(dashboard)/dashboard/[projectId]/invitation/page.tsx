import type { Route } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { InvitationEditor } from '@/components/projects/invitation-editor';
import { InvitationStudioDesignMode } from '@/components/projects/invitation-studio-design-mode';
import { InvitationStudioMediaMode } from '@/components/projects/invitation-studio-media-mode';
import { InvitationStudioPreviewMode } from '@/components/projects/invitation-studio-preview-mode';
import {
  parseInvitationStudioPreviewSurface,
  parseInvitationStudioPreviewVersion,
  parseInvitationStudioPreviewViewport,
} from '@/components/projects/invitation-studio-preview.types';
import { InvitationStudioProvider } from '@/components/projects/invitation-studio-provider';
import {
  InvitationStudioShell,
  type InvitationStudioStatusTone,
} from '@/components/projects/invitation-studio-shell';
import { parseInvitationStudioMode } from '@/components/projects/invitation-studio.types';
import {
  getInvitationEditorSectionStatuses,
  invitationEditorSections,
  type InvitationEditorSectionKey,
  type InvitationEditorSectionStatus,
} from '@/components/projects/invitation-editor-workspace';
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
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';
import { getCurrentPublishedInvitationForVerifiedProject } from '@/modules/publications/publication.repository';
import type { PublishedInvitationSnapshot } from '@/modules/publications/publication.types';
import { getInvitationReadinessForVerifiedProject } from '@/modules/readiness';

type InvitationEditorSearchParams = {
  mode?: string | string[];
  surface?: string | string[];
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
  publishedSnapshot: PublishedInvitationSnapshot | null;
  readiness: Awaited<ReturnType<typeof getInvitationReadinessForVerifiedProject>>;
};

type InvitationReadinessHandoffProps = {
  draft: OwnedInvitationEditor['draft'];
  projectId: string;
  readiness: InvitationEditorScreen['readiness'];
};

type InvitationStudioStatus = {
  label: string;
  tone: InvitationStudioStatusTone;
};

const readinessChapterOrder: readonly InvitationEditorSectionKey[] = [
  'style',
  'opening',
  'couple',
  'story',
  'schedule',
  'gallery',
  'gift',
  'rsvp',
  'closing',
];

const readinessStatusCopy: Record<InvitationEditorSectionStatus, string> = {
  complete: 'Siap',
  error: 'Perlu diperbaiki',
  incomplete: 'Belum lengkap',
  optional_off: 'Tidak ditampilkan',
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

function getInvitationChapterHref(projectId: string, chapter: InvitationEditorSectionKey): Route {
  return (
    chapter === 'style'
      ? `/dashboard/${projectId}/invitation?mode=design`
      : chapter === 'gallery'
        ? `/dashboard/${projectId}/invitation?mode=media`
        : `/dashboard/${projectId}/invitation?mode=content#bagian-${chapter}`
  ) as Route;
}

function InvitationReadinessHandoff({
  draft,
  projectId,
  readiness,
}: InvitationReadinessHandoffProps) {
  const statuses = getInvitationEditorSectionStatuses(draft);
  const chapters = readinessChapterOrder.map((key) => {
    const chapter = invitationEditorSections.find((candidate) => candidate.key === key);

    if (!chapter) {
      throw new Error(`Unknown invitation readiness chapter: ${key}`);
    }

    return { ...chapter, status: statuses[key] };
  });
  const blockers = chapters.filter(
    (chapter) =>
      !chapter.optional && (chapter.status === 'error' || chapter.status === 'incomplete'),
  );
  const attention = chapters.filter(
    (chapter) =>
      chapter.optional && (chapter.status === 'error' || chapter.status === 'incomplete'),
  );
  const readyCount = chapters.filter(
    (chapter) => chapter.status === 'complete' || chapter.status === 'optional_off',
  ).length;
  const firstBlocker = blockers[0];
  const state = blockers.length > 0 ? 'blocked' : attention.length > 0 ? 'attention' : 'ready';
  const stateCopy =
    state === 'blocked'
      ? {
          badge: 'Menghambat publikasi',
          description: `${blockers.length} bab wajib perlu dilengkapi pada draf tersimpan.`,
          title: 'Lengkapi bagian utama sebelum menerbitkan.',
        }
      : state === 'attention'
        ? {
            badge: 'Perlu perhatian',
            description: `${attention.length} bab opsional sedang aktif tetapi belum lengkap.`,
            title: 'Draf utama siap, periksa bagian opsional.',
          }
        : {
            badge: 'Siap',
            description: 'Semua bab wajib pada draf tersimpan sudah lengkap.',
            title: 'Draf tersimpan siap menuju penerbitan.',
          };
  const publicationControlAvailable =
    readiness.invitation.state === 'ready_to_publish' ||
    readiness.invitation.state === 'published_with_unpublished_changes';

  return (
    <section
      aria-labelledby="invitation-canonical-readiness-title"
      className="border-seraya-border-default bg-seraya-surface mb-5 rounded-[var(--seraya-radius-lg)] border p-4 shadow-[var(--seraya-shadow-soft)] sm:mb-6 sm:p-6"
      data-release-b-readiness-handoff="rb4"
    >
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-2xl">
          <p className="text-seraya-text-muted text-[0.68rem] font-bold tracking-[0.08em] uppercase">
            Kesiapan draf tersimpan
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2.5">
            <span
              className={[
                'inline-flex min-h-7 items-center rounded-full px-3 text-xs font-bold',
                state === 'blocked'
                  ? 'bg-seraya-status-error-soft text-seraya-status-error'
                  : state === 'attention'
                    ? 'bg-seraya-brand-soft text-seraya-action-primary'
                    : 'bg-seraya-status-success-soft text-seraya-status-success',
              ].join(' ')}
            >
              {stateCopy.badge}
            </span>
            <span className="text-seraya-text-muted text-xs font-semibold">
              {readyCount} dari {chapters.length} bab siap
            </span>
          </div>
          <h2
            className="text-seraya-text-primary mt-3 text-xl font-semibold tracking-[-0.02em] sm:text-2xl"
            id="invitation-canonical-readiness-title"
          >
            {stateCopy.title}
          </h2>
          <p className="text-seraya-text-muted mt-2 text-sm leading-6">
            {stateCopy.description} Perubahan yang masih berada di browser harus disimpan terlebih
            dahulu dan tidak mengubah versi yang sedang dilihat tamu.
          </p>
        </div>

        <div className="w-full shrink-0 xl:max-w-xs">
          {firstBlocker ? (
            <Link
              className="bg-seraya-action-primary text-seraya-text-inverse hover:bg-seraya-action-primary-hover focus-visible:outline-seraya-focus-ring inline-flex min-h-12 w-full items-center justify-center rounded-[var(--seraya-radius-md)] px-5 text-center text-sm font-semibold shadow-[0_8px_18px_rgb(142_75_82_/_0.16)] transition-colors focus-visible:outline-3 focus-visible:outline-offset-2"
              href={getInvitationChapterHref(projectId, firstBlocker.key)}
              prefetch={false}
            >
              Lengkapi undangan
            </Link>
          ) : readiness.invitation.state === 'draft_ready_unactivated' ? (
            <Link
              className="bg-seraya-action-primary text-seraya-text-inverse hover:bg-seraya-action-primary-hover focus-visible:outline-seraya-focus-ring inline-flex min-h-12 w-full items-center justify-center rounded-[var(--seraya-radius-md)] px-5 text-center text-sm font-semibold shadow-[0_8px_18px_rgb(142_75_82_/_0.16)] transition-colors focus-visible:outline-3 focus-visible:outline-offset-2"
              href={`/dashboard/${projectId}/billing`}
            >
              Lihat pembayaran
            </Link>
          ) : readiness.invitation.state === 'published' && readiness.invitation.publishedSlug ? (
            <Link
              className="bg-seraya-action-primary text-seraya-text-inverse hover:bg-seraya-action-primary-hover focus-visible:outline-seraya-focus-ring inline-flex min-h-12 w-full items-center justify-center rounded-[var(--seraya-radius-md)] px-5 text-center text-sm font-semibold shadow-[0_8px_18px_rgb(142_75_82_/_0.16)] transition-colors focus-visible:outline-3 focus-visible:outline-offset-2"
              href={`/${readiness.invitation.publishedSlug}`}
              rel="noreferrer"
              target="_blank"
            >
              Lihat undangan terbit
            </Link>
          ) : publicationControlAvailable ? (
            <p className="border-seraya-border-default bg-seraya-canvas text-seraya-text-secondary rounded-[var(--seraya-radius-md)] border px-4 py-3 text-sm leading-6">
              Gunakan satu tombol penerbitan di area status dokumen dalam studio setelah perubahan
              lokal tersimpan.
            </p>
          ) : (
            <p className="border-seraya-border-default bg-seraya-canvas text-seraya-text-secondary rounded-[var(--seraya-radius-md)] border px-4 py-3 text-sm leading-6">
              Simpan draf lalu periksa kembali kesiapan sebelum melanjutkan.
            </p>
          )}
        </div>
      </div>

      <ol className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {chapters.map((chapter) => {
          const needsAttention = chapter.status === 'error' || chapter.status === 'incomplete';
          const content = (
            <>
              <span
                aria-hidden="true"
                className={[
                  'inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                  chapter.status === 'error'
                    ? 'bg-seraya-status-error-soft text-seraya-status-error'
                    : chapter.status === 'complete'
                      ? 'bg-seraya-status-success-soft text-seraya-status-success'
                      : 'bg-seraya-brand-soft text-seraya-text-secondary',
                ].join(' ')}
              >
                {chapter.status === 'complete'
                  ? '✓'
                  : chapter.status === 'error'
                    ? '!'
                    : chapter.status === 'optional_off'
                      ? '–'
                      : '○'}
              </span>
              <span className="min-w-0">
                <span className="text-seraya-text-primary block text-sm font-semibold">
                  {chapter.number} · {chapter.studioLabel}
                </span>
                <span className="text-seraya-text-muted mt-0.5 block text-xs leading-5">
                  {readinessStatusCopy[chapter.status]}
                  {chapter.optional ? ' · Opsional' : ' · Wajib'}
                </span>
              </span>
            </>
          );

          return (
            <li key={chapter.key}>
              {needsAttention ? (
                <Link
                  className="border-seraya-border-default bg-seraya-canvas hover:border-seraya-border-strong hover:bg-seraya-brand-soft/35 focus-visible:outline-seraya-focus-ring flex min-h-16 items-center gap-3 rounded-[var(--seraya-radius-md)] border px-3.5 py-3 transition-colors focus-visible:outline-3 focus-visible:outline-offset-2"
                  href={getInvitationChapterHref(projectId, chapter.key)}
                  prefetch={false}
                >
                  {content}
                </Link>
              ) : (
                <div className="border-seraya-border-default bg-seraya-canvas flex min-h-16 items-center gap-3 rounded-[var(--seraya-radius-md)] border px-3.5 py-3">
                  {content}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
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
        const [audio, publishedSnapshot] = await Promise.all([
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
  const studioStatus = getInvitationStudioStatus(screen.readiness);
  const initialPreviewVersion = parseInvitationStudioPreviewVersion(
    query.version,
    Boolean(screen.publishedSnapshot),
  );
  const initialPreviewSurface = parseInvitationStudioPreviewSurface(query.surface);
  const initialPreviewViewport = parseInvitationStudioPreviewViewport(query.viewport);

  return (
    <WorkspacePage kind="studio" width="studio">
      <InvitationStudioProvider
        initialDraft={screen.editor.draft}
        projectId={screen.editor.project.id}
      >
        <InvitationStudioShell
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
          media={
            <InvitationStudioMediaMode
              initialAudio={screen.audio}
              initialImages={screen.galleryImages}
              isPublished={screen.editor.project.status === 'published'}
              projectId={screen.editor.project.id}
            />
          }
          preview={
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
          statusTone={studioStatus.tone}
        >
          <div className="grid min-w-0 gap-5 sm:gap-6" data-invitation-studio-legacy-content>
            <InvitationReadinessHandoff
              draft={screen.editor.draft}
              projectId={screen.editor.project.id}
              readiness={screen.readiness}
            />
            <InvitationEditor
              draft={screen.editor.draft}
              projectId={screen.editor.project.id}
              readiness={screen.readiness}
            />
          </div>
        </InvitationStudioShell>
      </InvitationStudioProvider>
    </WorkspacePage>
  );
}
