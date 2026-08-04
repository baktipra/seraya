import type { Route } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Badge } from '@/design-system';
import { getOwnedProjectContextForRequest } from '@/modules/auth/dashboard-request-context';
import {
  createInvitationViewModel,
  InvitationTemplateRenderer,
  type InvitationViewModel,
  type PersonalInvitationPresentationSlotsV1,
} from '@/modules/invitation-templates';
import {
  getOwnedProjectPrivateInvitationDraftForVerifiedProject,
  type OwnedProjectPrivateInvitationDraft,
} from '@/modules/invitations/invitation-draft.service';
import { getPrivateGalleryImagesForVerifiedProject } from '@/modules/media/media.service';
import type { InvitationGalleryImage } from '@/modules/media/media.types';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

type InvitationReviewSurface = 'generic' | 'personal';
type InvitationReviewViewport = 'desktop' | 'mobile';

type OwnedProjectPrivateInvitationDraftWithDraft = Omit<
  OwnedProjectPrivateInvitationDraft,
  'draft'
> & {
  draft: NonNullable<OwnedProjectPrivateInvitationDraft['draft']>;
};

type InvitationPreviewSearchParams = Record<string, string | string[] | undefined>;

type InvitationPreviewPageProps = {
  params: Promise<{ projectId: string }>;
  searchParams?: Promise<InvitationPreviewSearchParams>;
};

const reviewPanelStyle = {
  border: '1px solid color-mix(in srgb, currentColor 18%, transparent)',
  borderRadius: '1.25rem',
  padding: '1.25rem',
} as const;

export const dynamic = 'force-dynamic';

function getSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getReviewSurface(value: string | undefined): InvitationReviewSurface {
  return value === 'personal' ? 'personal' : 'generic';
}

function getReviewViewport(value: string | undefined): InvitationReviewViewport {
  return value === 'desktop' ? 'desktop' : 'mobile';
}

function getReviewHref(
  projectId: string,
  surface: InvitationReviewSurface,
  viewport: InvitationReviewViewport,
): Route {
  const search = new URLSearchParams({ surface, viewport });
  return `/dashboard/${projectId}/preview?${search.toString()}` as Route;
}

function getEmbeddedReviewHref(projectId: string, surface: InvitationReviewSurface): Route {
  const search = new URLSearchParams({ embed: '1', surface });
  return `/dashboard/${projectId}/preview?${search.toString()}` as Route;
}

function createReviewPersonalSlots(
  invitation: InvitationViewModel,
): PersonalInvitationPresentationSlotsV1 {
  const coupleLabel = `${invitation.couple.personOne.displayName} & ${invitation.couple.personTwo.displayName}`;

  return {
    greeting: (
      <div data-rb5-review-slot="greeting">
        <p className="text-xs font-semibold tracking-[0.16em] uppercase opacity-65">Kepada Yth.</p>
        <p className="mt-3 font-serif text-3xl leading-tight">Bapak/Ibu Keluarga Pramudia</p>
        <p className="mt-4 text-sm leading-7 opacity-75">
          Dengan penuh rasa bahagia, kami mengundang Anda dan keluarga untuk hadir serta menyertai
          hari pernikahan kami.
        </p>
      </div>
    ),
    rsvp: (
      <section data-rb5-review-slot="rsvp" style={reviewPanelStyle}>
        <p className="text-xs font-semibold tracking-[0.14em] uppercase opacity-65">
          Simulasi personal
        </p>
        <h3 className="mt-3 font-serif text-3xl leading-tight">Konfirmasi Kehadiran</h3>
        <p className="mt-3 text-sm leading-6 opacity-75">
          Tampilan ini tidak membuat guest-link dan tidak menyimpan jawaban.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            className="min-h-12 rounded-full border border-current px-5"
            disabled
            type="button"
          >
            Hadir
          </button>
          <button
            className="min-h-12 rounded-full border border-current px-5"
            disabled
            type="button"
          >
            Tidak hadir
          </button>
        </div>
      </section>
    ),
    guestbook: (
      <section data-rb5-review-slot="guestbook" style={reviewPanelStyle}>
        <p className="text-xs font-semibold tracking-[0.14em] uppercase opacity-65">
          Simulasi personal
        </p>
        <h3 className="mt-3 font-serif text-3xl leading-tight">Titipkan Ucapan</h3>
        <textarea
          aria-label="Contoh kolom ucapan yang tidak aktif"
          className="mt-5 min-h-28 w-full resize-none rounded-2xl border border-current bg-transparent p-4 opacity-65"
          disabled
          placeholder={`Doa dan ucapan untuk ${coupleLabel}`}
        />
        <button
          className="mt-3 min-h-12 rounded-full border border-current px-5"
          disabled
          type="button"
        >
          Kirim ucapan
        </button>
      </section>
    ),
  };
}

async function getPrivateDraftOrNotFound(
  projectId: string,
): Promise<OwnedProjectPrivateInvitationDraftWithDraft> {
  let privateDraft: OwnedProjectPrivateInvitationDraft;

  try {
    const project = await getOwnedProjectContextForRequest(projectId);
    privateDraft = await getOwnedProjectPrivateInvitationDraftForVerifiedProject(project);
  } catch (error) {
    if (error instanceof ProjectAccessDeniedError) {
      notFound();
    }

    throw error;
  }

  if (!privateDraft.draft) {
    notFound();
  }

  return privateDraft as OwnedProjectPrivateInvitationDraftWithDraft;
}

async function getReviewGalleryImages(
  privateDraft: OwnedProjectPrivateInvitationDraftWithDraft,
  projectId: string,
) {
  try {
    return await getPrivateGalleryImagesForVerifiedProject({
      draftImageIds: privateDraft.draft.content.gallery.imageIds,
      project: privateDraft.project,
    });
  } catch (error) {
    console.error('Seraya private preview gallery resolution failed.', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
      projectId,
    });

    return [] satisfies InvitationGalleryImage[];
  }
}

export default async function InvitationPreviewPage({
  params,
  searchParams,
}: InvitationPreviewPageProps) {
  const { projectId } = await params;
  const query: InvitationPreviewSearchParams = searchParams ? await searchParams : {};
  const surface = getReviewSurface(getSearchParam(query.surface));
  const viewport = getReviewViewport(getSearchParam(query.viewport));
  const embedded = getSearchParam(query.embed) === '1';
  const privateDraft = await getPrivateDraftOrNotFound(projectId);

  if (embedded) {
    const galleryImages = await getReviewGalleryImages(privateDraft, projectId);
    const invitation = createInvitationViewModel({
      draft: privateDraft.draft,
      galleryImages,
      project: privateDraft.project,
    });
    const personalSlots =
      surface === 'personal' ? createReviewPersonalSlots(invitation) : undefined;

    return (
      <main
        className="bg-seraya-ivory fixed inset-0 z-[9999] overflow-x-hidden overflow-y-auto"
        data-release-b-exact-guest-surface="rb5"
        data-review-surface={surface}
      >
        <InvitationTemplateRenderer
          invitation={invitation}
          paletteKey={privateDraft.draft.content.paletteKey}
          personalSlots={personalSlots}
          surface={surface}
          templateKey={privateDraft.draft.content.templateKey}
        />
      </main>
    );
  }

  const coupleLabel = `${privateDraft.draft.content.couple.personOne.displayName} & ${privateDraft.draft.content.couple.personTwo.displayName}`;
  const surfaceLabel = surface === 'personal' ? 'Simulasi personal' : 'Undangan umum';
  const frameClasses =
    viewport === 'desktop'
      ? 'h-[min(78svh,52rem)] w-[76rem] max-w-none rounded-[1.25rem] border-[0.3rem]'
      : 'h-[min(78svh,52rem)] w-[24.375rem] max-w-full rounded-[2rem] border-[0.45rem]';

  return (
    <section
      aria-labelledby="invitation-review-title"
      className="space-y-5 sm:space-y-7"
      data-release-b-exact-guest-review="rb5"
    >
      <header className="border-seraya-border-default bg-seraya-surface rounded-[var(--seraya-radius-lg)] border px-4 py-4 shadow-[var(--seraya-shadow-soft)] sm:px-5 sm:py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Link
              className="text-seraya-action-primary focus-visible:outline-seraya-focus-ring inline-flex min-h-10 items-center rounded-[var(--seraya-radius-sm)] text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-3"
              href={`/dashboard/${projectId}/invitation`}
            >
              ← Kembali ke studio
            </Link>
            <p className="text-seraya-text-muted mt-4 text-[0.68rem] font-bold tracking-[0.08em] uppercase">
              Tinjau sebagai tamu
            </p>
            <h1
              className="text-seraya-text-primary mt-2 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl"
              id="invitation-review-title"
            >
              Periksa draf tersimpan sebelum diterbitkan
            </h1>
            <p className="text-seraya-text-muted mt-2 max-w-3xl text-sm leading-6 sm:text-base sm:leading-7">
              Review ini memakai renderer tamu yang sama dengan undangan terbit. Perubahan lokal di
              studio harus disimpan terlebih dahulu agar tampil di sini.
            </p>
          </div>
          <Badge variant={privateDraft.project.status === 'published' ? 'success' : 'warning'}>
            Draf tersimpan
          </Badge>
        </div>

        <dl className="border-seraya-border-default bg-seraya-canvas mt-5 grid gap-3 rounded-[var(--seraya-radius-md)] border p-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-seraya-text-muted">Pasangan</dt>
            <dd className="text-seraya-text-primary mt-1 font-semibold">{coupleLabel}</dd>
          </div>
          <div>
            <dt className="text-seraya-text-muted">Template</dt>
            <dd className="text-seraya-text-primary mt-1 font-semibold capitalize">
              {privateDraft.draft.content.templateKey}
            </dd>
          </div>
          <div>
            <dt className="text-seraya-text-muted">Permukaan</dt>
            <dd className="text-seraya-text-primary mt-1 font-semibold">{surfaceLabel}</dd>
          </div>
        </dl>
      </header>

      <section
        aria-label="Kontrol review tamu"
        className="border-seraya-border-default bg-seraya-surface rounded-[var(--seraya-radius-lg)] border p-4 shadow-[var(--seraya-shadow-soft)] sm:p-5"
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <p className="text-seraya-text-primary text-sm font-semibold">Pengalaman tamu</p>
            <nav
              aria-label="Pilih pengalaman tamu"
              className="border-seraya-border-default bg-seraya-canvas mt-2 inline-flex max-w-full rounded-[var(--seraya-radius-md)] border p-1"
            >
              {(['generic', 'personal'] as const).map((candidate) => {
                const active = candidate === surface;

                return (
                  <Link
                    aria-current={active ? 'page' : undefined}
                    className={[
                      'focus-visible:outline-seraya-focus-ring inline-flex min-h-10 items-center justify-center rounded-[calc(var(--seraya-radius-md)-0.25rem)] px-3 text-center text-xs font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 sm:px-4 sm:text-sm',
                      active
                        ? 'bg-seraya-surface text-seraya-action-primary shadow-sm'
                        : 'text-seraya-text-secondary hover:text-seraya-text-primary',
                    ].join(' ')}
                    href={getReviewHref(projectId, candidate, viewport)}
                    key={candidate}
                  >
                    {candidate === 'generic' ? 'Undangan umum' : 'Simulasi personal'}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div>
            <p className="text-seraya-text-primary text-sm font-semibold">Ukuran layar</p>
            <nav
              aria-label="Pilih ukuran layar review"
              className="border-seraya-border-default bg-seraya-canvas mt-2 inline-flex max-w-full rounded-[var(--seraya-radius-md)] border p-1"
            >
              {(['mobile', 'desktop'] as const).map((candidate) => {
                const active = candidate === viewport;

                return (
                  <Link
                    aria-current={active ? 'page' : undefined}
                    className={[
                      'focus-visible:outline-seraya-focus-ring inline-flex min-h-10 items-center justify-center rounded-[calc(var(--seraya-radius-md)-0.25rem)] px-4 text-sm font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2',
                      active
                        ? 'bg-seraya-surface text-seraya-action-primary shadow-sm'
                        : 'text-seraya-text-secondary hover:text-seraya-text-primary',
                    ].join(' ')}
                    href={getReviewHref(projectId, surface, candidate)}
                    key={candidate}
                  >
                    {candidate === 'mobile' ? 'Ponsel' : 'Desktop'}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {surface === 'personal' ? (
          <p className="border-seraya-border-default bg-seraya-brand-soft/45 text-seraya-text-secondary mt-4 rounded-[var(--seraya-radius-md)] border px-4 py-3 text-sm leading-6">
            Simulasi personal memakai nama tamu contoh. Tidak ada guest-link, RSVP, atau ucapan yang
            dibuat maupun disimpan.
          </p>
        ) : (
          <p className="text-seraya-text-muted mt-4 text-sm leading-6">
            Mode umum menunjukkan pengalaman yang dapat dibuka melalui slug publik setelah
            diterbitkan.
          </p>
        )}
      </section>

      <section
        aria-label={`Review ${surfaceLabel} pada ${viewport === 'mobile' ? 'ponsel' : 'desktop'}`}
        className="border-seraya-border-default bg-seraya-canvas overflow-hidden rounded-[var(--seraya-radius-lg)] border shadow-[var(--seraya-shadow-soft)]"
      >
        <div className="border-seraya-border-default bg-seraya-surface flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 text-xs sm:px-5">
          <p className="text-seraya-text-primary font-semibold">{surfaceLabel}</p>
          <p className="text-seraya-text-muted font-semibold">
            {viewport === 'mobile' ? '390 × viewport ponsel' : 'Komposisi desktop'}
          </p>
        </div>
        <div className="max-w-full overflow-auto p-3 sm:p-5">
          <div
            className={`${frameClasses} border-seraya-ink bg-seraya-ink relative mx-auto shrink-0 overflow-hidden shadow-[0_24px_60px_rgb(43_37_35_/_0.18)]`}
            data-exact-guest-review-device={viewport}
          >
            {viewport === 'mobile' ? (
              <span
                aria-hidden="true"
                className="absolute top-2 left-1/2 z-10 h-1.5 w-16 -translate-x-1/2 rounded-full bg-white/35"
              />
            ) : null}
            <iframe
              className="bg-seraya-ivory h-full w-full border-0"
              data-exact-guest-review-frame
              src={getEmbeddedReviewHref(projectId, surface)}
              title={`Review ${surfaceLabel} ${coupleLabel}`}
            />
          </div>
        </div>
      </section>
    </section>
  );
}
