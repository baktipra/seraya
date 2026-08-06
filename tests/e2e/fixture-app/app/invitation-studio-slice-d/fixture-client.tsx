'use client';

import type { Route } from 'next';

import { InvitationStudioMediaMode } from '../../../../../src/components/projects/invitation-studio-media-mode';
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
import type { InvitationAudioSummary } from '../../../../../src/modules/media/invitation-audio.types';
import type { InvitationGalleryImage } from '../../../../../src/modules/media/media.types';

const fixtureSaveAction: InvitationStudioSaveAction = async () => {
  await new Promise((resolve) => window.setTimeout(resolve, 100));

  return {
    message: 'Pengaturan galeri sudah disimpan.',
    status: 'success',
  };
};

function FixtureContentForm({ projectId }: { projectId: string }) {
  const { content, formAction, formId, submissionPayload, updateLocalContent } =
    useInvitationStudioState();

  return (
    <form
      action={formAction}
      className="border-seraya-border-default bg-seraya-surface grid gap-5 rounded-[var(--seraya-radius-lg)] border p-5"
      data-slice-d-content-form
      id={formId}
    >
      <input name="projectId" type="hidden" value={projectId} />
      <input name="editorPayload" type="hidden" value={submissionPayload} />
      <div>
        <p className="text-seraya-text-muted text-xs font-bold tracking-[0.08em] uppercase">
          Fixture mode Isi
        </p>
        <h2 className="text-seraya-text-primary mt-2 text-xl font-semibold">
          Media dan komposisi membaca draf yang sama.
        </h2>
      </div>
      <dl className="grid gap-3 text-sm">
        <div>
          <dt className="text-seraya-text-muted">Urutan galeri</dt>
          <dd className="text-seraya-text-primary mt-1 break-all" data-slice-d-gallery-order>
            {content.gallery.imageIds.join(',') || 'none'}
          </dd>
        </div>
        <div>
          <dt className="text-seraya-text-muted">Galeri tampil</dt>
          <dd className="text-seraya-text-primary mt-1" data-slice-d-gallery-enabled>
            {String(content.gallery.enabled)}
          </dd>
        </div>
        <div>
          <dt className="text-seraya-text-muted">Audio aktif</dt>
          <dd className="text-seraya-text-primary mt-1 break-all" data-slice-d-audio-id>
            {content.audio.assetId ?? 'none'}
          </dd>
        </div>
      </dl>
      <button
        className="border-seraya-border-default bg-seraya-canvas text-seraya-text-primary min-h-11 w-fit rounded-[var(--seraya-radius-md)] border px-4 text-sm font-semibold"
        data-slice-d-toggle-gallery
        onClick={() =>
          updateLocalContent({
            enabled: !content.gallery.enabled,
            type: 'gallery-visibility',
          })
        }
        type="button"
      >
        Ubah visibilitas galeri
      </button>
    </form>
  );
}

export function InvitationStudioSliceDFixture({
  initialAudio,
  initialDraft,
  initialImages,
  initialMode,
  projectId,
}: {
  initialAudio: InvitationAudioSummary;
  initialDraft: InvitationDraft;
  initialImages: InvitationGalleryImage[];
  initialMode: InvitationStudioMode;
  projectId: string;
}) {
  return (
    <ToastProvider>
      <InvitationStudioProvider
        initialDraft={initialDraft}
        projectId={projectId}
        refreshOnSuccess={false}
        saveAction={fixtureSaveAction}
      >
        <InvitationStudioShell
          content={<FixtureContentForm projectId={projectId} />}
          coupleLabel="Nadia & Raka"
          design={
            <InvitationStudioModePlaceholder
              description="Desain tetap memakai authority Slice C."
              eyebrow="Desain"
              title="Template dan palet tetap aman."
            />
          }
          initialMode={initialMode}
          media={
            <InvitationStudioMediaMode
              initialAudio={initialAudio}
              initialImages={initialImages}
              isPublished
              projectId={projectId}
            />
          }
          preview={
            <InvitationStudioModePlaceholder
              description="Preview khusus berada di luar scope Slice D."
              eyebrow="Preview"
              title="Media tetap tersedia untuk renderer berikutnya."
            />
          }
          previewHref={'/invitation-studio-slice-d?mode=media' as Route}
          publish={
            <InvitationStudioModePlaceholder
              description="Aset privat baru sampai ke tamu setelah publish atau republish."
              eyebrow="Terbitkan"
              title="Media bukan bukti versi tamu sudah berubah."
            />
          }
          statusLabel="Draf pribadi"
          statusTone="neutral"
        />
      </InvitationStudioProvider>
    </ToastProvider>
  );
}
