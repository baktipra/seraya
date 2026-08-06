'use client';

import type { Route } from 'next';

import { InvitationStudioDesignMode } from '../../../../../src/components/projects/invitation-studio-design-mode';
import { InvitationStudioModePlaceholder } from '../../../../../src/components/projects/invitation-studio-mode-placeholder';
import {
  InvitationStudioProvider,
  useInvitationStudioState,
  type InvitationStudioSaveAction,
} from '../../../../../src/components/projects/invitation-studio-provider';
import { InvitationStudioShell } from '../../../../../src/components/projects/invitation-studio-shell';
import type { InvitationStudioMode } from '../../../../../src/components/projects/invitation-studio.types';
import { ToastProvider } from '../../../../../src/design-system';
import type { InvitationDraft } from '../../../../../src/modules/invitations/invitation-draft.types';

const fixtureSaveAction: InvitationStudioSaveAction = async () => {
  await new Promise((resolve) => window.setTimeout(resolve, 100));

  return {
    message: 'Perubahan desain sudah disimpan.',
    status: 'success',
  };
};

function FixtureContentForm() {
  const { content, formAction, formId, submissionPayload } = useInvitationStudioState();

  return (
    <form
      action={formAction}
      className="border-seraya-border-default bg-seraya-surface grid gap-4 rounded-[var(--seraya-radius-lg)] border p-5"
      data-slice-c-content-form
      id={formId}
    >
      <input name="projectId" type="hidden" value="slice-c-project" />
      <input
        data-slice-c-editor-payload
        name="editorPayload"
        type="hidden"
        value={submissionPayload}
      />
      <p className="text-seraya-text-muted text-xs font-bold tracking-[0.08em] uppercase">
        Mode Isi
      </p>
      <h2 className="text-seraya-text-primary text-xl font-semibold">
        Konten tetap memakai draf yang sama.
      </h2>
      <p className="text-seraya-text-secondary text-sm leading-6">
        Template aktif: <strong data-slice-c-content-template>{content.templateKey}</strong>
      </p>
    </form>
  );
}

export function InvitationStudioSliceCFixture({
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
        projectId="slice-c-project"
        refreshOnSuccess={false}
        saveAction={fixtureSaveAction}
      >
        <InvitationStudioShell
          content={<FixtureContentForm />}
          coupleLabel="Nadia & Raka"
          design={
            <InvitationStudioDesignMode
              project={{ event_date_primary: '2027-06-12' }}
              projectId="slice-c-project"
            />
          }
          initialMode={initialMode}
          media={
            <InvitationStudioModePlaceholder
              description="Media tetap berada di luar cakupan Slice C."
              eyebrow="Media"
              title="Authority media belum dipindahkan."
            />
          }
          preview={
            <InvitationStudioModePlaceholder
              description="Mode Preview khusus akan diaktifkan pada slice berikutnya."
              eyebrow="Preview"
              title="Design Mode sudah memiliki renderer exact."
            />
          }
          previewHref={'/invitation-studio-slice-c?mode=design' as Route}
          publish={
            <InvitationStudioModePlaceholder
              description="Versi tamu tidak berubah hanya karena pilihan lokal."
              eyebrow="Terbitkan"
              title="Simpan lalu terbitkan secara terpisah."
            />
          }
          statusLabel="Draf pribadi"
          statusTone="neutral"
        />
      </InvitationStudioProvider>
    </ToastProvider>
  );
}
