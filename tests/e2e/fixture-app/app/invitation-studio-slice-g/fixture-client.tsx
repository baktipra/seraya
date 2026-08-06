'use client';

import { InvitationEditor } from '../../../../../src/components/projects/invitation-editor';
import { InvitationStudioDesignMode } from '../../../../../src/components/projects/invitation-studio-design-mode';
import { InvitationStudioMediaMode } from '../../../../../src/components/projects/invitation-studio-media-mode';
import { InvitationStudioPreviewMode } from '../../../../../src/components/projects/invitation-studio-preview-mode';
import { InvitationStudioPublishMode } from '../../../../../src/components/projects/invitation-studio-publish-mode';
import {
  InvitationStudioProvider,
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
  return { message: 'Draf responsive regression sudah disimpan.', status: 'success' };
};

type InvitationStudioSliceGFixtureProps = {
  initialMode: InvitationStudioMode;
  paymentOverview: PaymentOverview;
  publishedSnapshot: PublishedInvitationSnapshot | null;
  readiness: InvitationReadinessV1;
  savedDraft: InvitationDraft;
};

export function InvitationStudioSliceGFixture({
  initialMode,
  paymentOverview,
  publishedSnapshot,
  readiness,
  savedDraft,
}: InvitationStudioSliceGFixtureProps) {
  const hasPublishedSnapshot = Boolean(publishedSnapshot);

  return (
    <ToastProvider>
      <InvitationStudioProvider
        initialDraft={savedDraft}
        projectId="slice-g-project"
        refreshOnSuccess={false}
        saveAction={fixtureSaveAction}
      >
        <InvitationStudioShell
          coupleLabel="Nadia Maharani Prameswari & Raka Aditya Wiranegara"
          design={
            <InvitationStudioDesignMode
              galleryImages={[]}
              project={{ event_date_primary: '2027-06-12' }}
              projectId="slice-g-project"
            />
          }
          initialMode={initialMode}
          media={
            <InvitationStudioMediaMode
              initialAudio={null}
              initialImages={[]}
              isPublished={hasPublishedSnapshot}
              projectId="slice-g-project"
            />
          }
          preview={
            <InvitationStudioPreviewMode
              initialSurface="generic"
              initialVersion="saved"
              initialViewport="mobile"
              project={{ event_date_primary: '2027-06-12', id: 'slice-g-project' }}
              publicationState={readiness.invitation.state}
              publishedSnapshot={publishedSnapshot}
              savedDraft={savedDraft}
            />
          }
          publish={
            <InvitationStudioPublishMode
              draft={savedDraft}
              paymentOverview={paymentOverview}
              projectId="slice-g-project"
              publishedSnapshot={publishedSnapshot}
              readiness={readiness}
            />
          }
          statusLabel={
            readiness.invitation.state === 'published_with_unpublished_changes'
              ? 'Perubahan belum diterbitkan'
              : hasPublishedSnapshot
                ? 'Undangan aktif'
                : 'Siap diterbitkan'
          }
          statusTone={
            readiness.invitation.state === 'published_with_unpublished_changes'
              ? 'warning'
              : hasPublishedSnapshot
                ? 'success'
                : 'brand'
          }
        >
          <div className="grid min-w-0 gap-5 sm:gap-6" data-invitation-studio-content-mode>
            <InvitationEditor
              draft={savedDraft}
              projectId="slice-g-project"
              readiness={readiness}
            />
          </div>
        </InvitationStudioShell>
      </InvitationStudioProvider>
    </ToastProvider>
  );
}
