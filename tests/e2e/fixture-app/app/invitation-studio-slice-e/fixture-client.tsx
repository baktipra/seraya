'use client';

import { InvitationStudioModePlaceholder } from '../../../../../src/components/projects/invitation-studio-mode-placeholder';
import { InvitationStudioPreviewMode } from '../../../../../src/components/projects/invitation-studio-preview-mode';
import {
  InvitationStudioProvider,
  useInvitationStudioState,
  type InvitationStudioSaveAction,
} from '../../../../../src/components/projects/invitation-studio-provider';
import { InvitationStudioShell } from '../../../../../src/components/projects/invitation-studio-shell';
import type { InvitationStudioMode } from '../../../../../src/components/projects/invitation-studio.types';
import type {
  InvitationStudioPreviewSurface,
  InvitationStudioPreviewVersion,
  InvitationStudioPreviewViewport,
} from '../../../../../src/components/projects/invitation-studio-preview.types';
import { ToastProvider } from '../../../../../src/design-system';
import type { InvitationDraft } from '../../../../../src/modules/invitations/invitation-draft.types';
import type { PublishedInvitationSnapshot } from '../../../../../src/modules/publications/publication.types';

const fixtureSaveAction: InvitationStudioSaveAction = async () => {
  await new Promise((resolve) => window.setTimeout(resolve, 80));
  return { message: 'Draf preview sudah disimpan.', status: 'success' };
};

function FixtureContentForm() {
  const { content, formAction, formId, submissionPayload, updateLocalContent } =
    useInvitationStudioState();

  return (
    <form
      action={formAction}
      className="border-seraya-border-default bg-seraya-surface grid gap-4 rounded-[var(--seraya-radius-lg)] border p-5"
      id={formId}
    >
      <input name="projectId" type="hidden" value="slice-e-project" />
      <input name="editorPayload" type="hidden" value={submissionPayload} />
      <p className="text-seraya-text-muted text-xs font-bold tracking-[0.08em] uppercase">
        Fixture Isi
      </p>
      <h2 className="text-seraya-text-primary text-xl font-semibold">Ubah versi lokal</h2>
      <p className="text-seraya-text-secondary text-sm leading-6" data-slice-e-local-title>
        {content.hero.title}
      </p>
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
        Ubah judul lokal
      </button>
    </form>
  );
}

export function InvitationStudioSliceEFixture({
  initialMode,
  initialSurface,
  initialVersion,
  initialViewport,
  publishedSnapshot,
  savedDraft,
}: {
  initialMode: InvitationStudioMode;
  initialSurface: InvitationStudioPreviewSurface;
  initialVersion: InvitationStudioPreviewVersion;
  initialViewport: InvitationStudioPreviewViewport;
  publishedSnapshot: PublishedInvitationSnapshot | null;
  savedDraft: InvitationDraft;
}) {
  return (
    <ToastProvider>
      <InvitationStudioProvider
        initialDraft={savedDraft}
        projectId="slice-e-project"
        refreshOnSuccess={false}
        saveAction={fixtureSaveAction}
      >
        <InvitationStudioShell
          content={<FixtureContentForm />}
          coupleLabel="Nadia & Raka"
          design={
            <InvitationStudioModePlaceholder
              description="Fixture desain tidak dibutuhkan untuk kontrak Preview Mode."
              eyebrow="Desain"
              title="Authority desain tetap terpisah."
            />
          }
          initialMode={initialMode}
          media={
            <InvitationStudioModePlaceholder
              description="Fixture media tidak dibutuhkan untuk kontrak Preview Mode."
              eyebrow="Media"
              title="Authority media tetap terpisah."
            />
          }
          preview={
            <InvitationStudioPreviewMode
              initialSurface={initialSurface}
              initialVersion={initialVersion}
              initialViewport={initialViewport}
              project={{ event_date_primary: '2027-06-12', id: 'slice-e-project' }}
              publicationState={
                publishedSnapshot ? 'published_with_unpublished_changes' : 'ready_to_publish'
              }
              publishedSnapshot={publishedSnapshot}
              savedDraft={savedDraft}
            />
          }
          publish={
            <InvitationStudioModePlaceholder
              description="Publish authority belum dipindahkan pada Slice E."
              eyebrow="Terbitkan"
              title="Preview tidak menerbitkan perubahan."
            />
          }
          statusLabel={publishedSnapshot ? 'Perubahan belum diterbitkan' : 'Siap diterbitkan'}
          statusTone={publishedSnapshot ? 'warning' : 'brand'}
        />
      </InvitationStudioProvider>
    </ToastProvider>
  );
}
