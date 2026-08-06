'use client';

import { InvitationStudioModePlaceholder } from '../../../../../src/components/projects/invitation-studio-mode-placeholder';
import { InvitationStudioPublishMode } from '../../../../../src/components/projects/invitation-studio-publish-mode';
import {
  InvitationStudioProvider,
  useInvitationStudioState,
  type InvitationStudioSaveAction,
} from '../../../../../src/components/projects/invitation-studio-provider';
import { InvitationStudioShell } from '../../../../../src/components/projects/invitation-studio-shell';
import type { InvitationStudioMode } from '../../../../../src/components/projects/invitation-studio.types';
import { ToastProvider } from '../../../../../src/design-system';
import type { InvitationDraft } from '../../../../../src/modules/invitations/invitation-draft.types';
import type { PaymentOverview } from '../../../../../src/modules/payments';
import type { PublishedInvitationSnapshot } from '../../../../../src/modules/publications/publication.types';
import type { InvitationReadinessV1 } from '../../../../../src/modules/readiness';

const fixtureSaveAction: InvitationStudioSaveAction = async () => {
  await new Promise((resolve) => window.setTimeout(resolve, 80));
  return { message: 'Draf publish sudah disimpan.', status: 'success' };
};

function FixtureContentForm() {
  const { content, formAction, formId, submissionPayload, updateLocalContent } =
    useInvitationStudioState();

  return (
    <form
      action={formAction}
      className="border-seraya-border-default bg-seraya-surface grid gap-4 rounded-[var(--seraya-radius-lg)] border p-5"
      data-slice-f-content-mode
      id={formId}
    >
      <input name="projectId" type="hidden" value="slice-f-project" />
      <input name="editorPayload" type="hidden" value={submissionPayload} />
      <p className="text-seraya-text-muted text-xs font-bold tracking-[0.08em] uppercase">
        Fixture Isi
      </p>
      <h2 className="text-seraya-text-primary text-xl font-semibold">Ubah versi lokal</h2>
      <p className="text-seraya-text-secondary text-sm leading-6">{content.hero.title}</p>
      <button
        className="bg-seraya-action-primary text-seraya-text-inverse min-h-11 w-fit rounded-[var(--seraya-radius-md)] px-4 text-sm font-semibold"
        onClick={() =>
          updateLocalContent({
            field: 'title',
            type: 'hero',
            value: 'Perubahan lokal Nadia & Raka',
          })
        }
        type="button"
      >
        Buat perubahan lokal
      </button>
    </form>
  );
}

type InvitationStudioSliceFFixtureProps = {
  initialMode: InvitationStudioMode;
  paymentOverview: PaymentOverview;
  publishedSnapshot: PublishedInvitationSnapshot | null;
  readiness: InvitationReadinessV1;
  savedDraft: InvitationDraft;
};

export function InvitationStudioSliceFFixture({
  initialMode,
  paymentOverview,
  publishedSnapshot,
  readiness,
  savedDraft,
}: InvitationStudioSliceFFixtureProps) {
  const hasPublishedSnapshot = Boolean(publishedSnapshot);

  return (
    <ToastProvider>
      <InvitationStudioProvider
        initialDraft={savedDraft}
        projectId="slice-f-project"
        refreshOnSuccess={false}
        saveAction={fixtureSaveAction}
      >
        <InvitationStudioShell
          content={<FixtureContentForm />}
          coupleLabel="Nadia & Raka"
          design={
            <InvitationStudioModePlaceholder
              description="Fixture desain tidak dibutuhkan untuk kontrak Publish Mode."
              eyebrow="Desain"
              title="Authority desain tetap terpisah."
            />
          }
          initialMode={initialMode}
          media={
            <InvitationStudioModePlaceholder
              description="Fixture media tidak dibutuhkan untuk kontrak Publish Mode."
              eyebrow="Media"
              title="Authority media tetap terpisah."
            />
          }
          preview={
            <InvitationStudioModePlaceholder
              description="Fixture preview tidak mengubah publication state."
              eyebrow="Preview"
              title="Preview authority tetap terpisah."
            />
          }
          publish={
            <InvitationStudioPublishMode
              draft={savedDraft}
              paymentOverview={paymentOverview}
              projectId="slice-f-project"
              publishedSnapshot={publishedSnapshot}
              readiness={readiness}
            />
          }
          statusLabel={hasPublishedSnapshot ? 'Undangan aktif' : 'Siap diterbitkan'}
          statusTone={hasPublishedSnapshot ? 'success' : 'brand'}
        />
      </InvitationStudioProvider>
    </ToastProvider>
  );
}
