'use client';

import type { Route } from 'next';
import Link from 'next/link';

import { ToastProvider } from '../../../../../src/design-system';
import { InvitationStudioModePlaceholder } from '../../../../../src/components/projects/invitation-studio-mode-placeholder';
import {
  InvitationStudioProvider,
  useInvitationStudioState,
  type InvitationStudioSaveAction,
} from '../../../../../src/components/projects/invitation-studio-provider';
import { InvitationStudioShell } from '../../../../../src/components/projects/invitation-studio-shell';
import type { InvitationStudioMode } from '../../../../../src/components/projects/invitation-studio.types';
import type { InvitationDraft } from '../../../../../src/modules/invitations/invitation-draft.types';

const fixtureSaveAction: InvitationStudioSaveAction = async (_previousState, formData) => {
  await new Promise((resolve) => window.setTimeout(resolve, 120));

  const rawPayload = formData.get('editorPayload');
  const payload =
    typeof rawPayload === 'string'
      ? (JSON.parse(rawPayload) as { hero?: { title?: string | null } })
      : null;

  if (payload?.hero?.title?.toLowerCase().includes('gagal')) {
    return {
      message: 'Simulasi gagal menyimpan. Perubahan lokal tetap aman.',
      status: 'error',
    };
  }

  return {
    message: 'Perubahan undangan sudah disimpan.',
    status: 'success',
  };
};

function FixtureContent() {
  const { actionState, content, formAction, formId, submissionPayload, updateLocalContent } =
    useInvitationStudioState();

  return (
    <div className="grid min-w-0 gap-5">
      <form
        action={formAction}
        className="border-seraya-border-default bg-seraya-surface grid min-w-0 gap-5 rounded-[var(--seraya-radius-lg)] border p-5"
        id={formId}
      >
        <input name="projectId" type="hidden" value="slice-b-project" />
        <input name="editorPayload" type="hidden" value={submissionPayload} />

        <div>
          <p className="text-seraya-text-muted text-xs font-bold tracking-[0.08em] uppercase">
            Fixture state bersama
          </p>
          <h2 className="text-seraya-text-primary mt-2 text-xl font-semibold">
            Ubah judul lalu pindah mode
          </h2>
        </div>

        <label className="text-seraya-text-primary grid gap-2 text-sm font-semibold">
          Judul utama
          <input
            className="border-seraya-border-default bg-seraya-surface focus-visible:outline-seraya-focus-ring min-h-11 min-w-0 rounded-[var(--seraya-radius-md)] border px-3.5"
            data-slice-b-title-input
            name="fixtureTitle"
            onChange={(event) =>
              updateLocalContent({
                field: 'title',
                type: 'hero',
                value: event.currentTarget.value,
              })
            }
            value={content.hero.title ?? ''}
          />
        </label>

        {actionState.status === 'error' && actionState.message ? (
          <p
            className="border-seraya-status-error/25 bg-seraya-status-error-soft text-seraya-text-primary rounded-[var(--seraya-radius-md)] border px-4 py-3 text-sm"
            role="alert"
          >
            {actionState.message}
          </p>
        ) : null}

        <Link
          className="text-seraya-action-primary w-fit text-sm font-semibold underline-offset-4 hover:underline"
          data-slice-b-leave-link
          href={'/invitation-studio-slice-a' as Route}
        >
          Keluar dari studio
        </Link>
      </form>
    </div>
  );
}

export function InvitationStudioSliceBFixture({
  initialDraft,
  initialMode,
}: {
  initialDraft: InvitationDraft;
  initialMode: InvitationStudioMode;
}) {
  return (
    <ToastProvider>
      <InvitationStudioProvider
        initialDraft={initialDraft}
        projectId="slice-b-project"
        refreshOnSuccess={false}
        saveAction={fixtureSaveAction}
      >
        <InvitationStudioShell
          content={<FixtureContent />}
          coupleLabel="Nadia & Raka"
          design={
            <InvitationStudioModePlaceholder
              description="Mode ini tetap berbagi draf yang sama."
              eyebrow="Desain"
              title="State tidak dipisahkan per mode."
            />
          }
          initialMode={initialMode}
          media={
            <InvitationStudioModePlaceholder
              description="Media akan menggunakan authority yang sama pada slice berikutnya."
              eyebrow="Media"
              title="Perubahan Isi tetap tersimpan di memori."
            />
          }
          preview={
            <InvitationStudioModePlaceholder
              description="Preview membaca state yang sama tanpa membuat salinan draft."
              eyebrow="Preview"
              title="Satu sumber kebenaran."
            />
          }
          previewHref={'/invitation-studio-slice-b' as Route}
          publish={
            <InvitationStudioModePlaceholder
              description="Publikasi tetap menunggu draf yang berhasil disimpan."
              eyebrow="Terbitkan"
              title="Browser state bukan versi tamu."
            />
          }
          statusLabel="Draf pribadi"
          statusTone="neutral"
        />
      </InvitationStudioProvider>
    </ToastProvider>
  );
}
