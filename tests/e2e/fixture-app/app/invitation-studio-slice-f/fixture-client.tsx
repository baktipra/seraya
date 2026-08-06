'use client';

import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

import { InvitationStudioModePlaceholder } from '../../../../../src/components/projects/invitation-studio-mode-placeholder';
import { InvitationStudioPublishMode } from '../../../../../src/components/projects/invitation-studio-publish-mode';
import {
  InvitationStudioProvider,
  useInvitationStudioState,
  type InvitationStudioSaveAction,
} from '../../../../../src/components/projects/invitation-studio-provider';
import { InvitationStudioShell } from '../../../../../src/components/projects/invitation-studio-shell';
import { parseInvitationStudioMode } from '../../../../../src/components/projects/invitation-studio.types';
import { ToastProvider } from '../../../../../src/design-system';
import { createDefaultInvitationDraftContent } from '../../../../../src/modules/invitations/invitation-draft.defaults';
import type { InvitationDraft } from '../../../../../src/modules/invitations/invitation-draft.types';
import type { PaymentOverview } from '../../../../../src/modules/payments';
import type { PublishedInvitationSnapshot } from '../../../../../src/modules/publications/publication.types';
import type {
  InvitationReadinessState,
  InvitationReadinessV1,
} from '../../../../../src/modules/readiness';

const readinessStates: readonly InvitationReadinessState[] = [
  'draft_incomplete',
  'draft_ready_unactivated',
  'ready_to_publish',
  'published',
  'published_with_unpublished_changes',
];

const fixtureSaveAction: InvitationStudioSaveAction = async () => {
  await new Promise((resolve) => window.setTimeout(resolve, 80));
  return { message: 'Draf publish sudah disimpan.', status: 'success' };
};

function parseReadinessState(value: string | null): InvitationReadinessState {
  return readinessStates.includes(value as InvitationReadinessState)
    ? (value as InvitationReadinessState)
    : 'ready_to_publish';
}

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

export function InvitationStudioSliceFFixture() {
  const searchParams = useSearchParams();
  const readinessState = parseReadinessState(searchParams.get('state'));
  const revisionCandidate = Number(searchParams.get('revision') ?? '3');
  const revision = Number.isInteger(revisionCandidate) && revisionCandidate > 0 ? revisionCandidate : 3;
  const hasPublishedSnapshot =
    readinessState === 'published' || readinessState === 'published_with_unpublished_changes';
  const savedDraft = useMemo<InvitationDraft>(() => {
    const content = createDefaultInvitationDraftContent({
      default_timezone: 'Asia/Jakarta',
      event_date_primary: '2027-06-12',
      person_one_name: 'Nadia',
      person_two_name: 'Raka',
    });

    return {
      content: {
        ...content,
        hero: {
          ...content.hero,
          title: readinessState === 'draft_incomplete' ? '' : 'Nadia & Raka',
        },
      },
      created_at: '2026-08-06T00:00:00.000Z',
      deleted_at: null,
      id: 'slice-f-draft',
      project_id: 'slice-f-project',
      schema_version: 1,
      updated_at: '2026-08-06T06:00:00.000Z',
    };
  }, [readinessState]);
  const publishedSnapshot = useMemo<PublishedInvitationSnapshot | null>(
    () =>
      hasPublishedSnapshot
        ? {
            created_at: '2026-08-05T00:00:00.000Z',
            draft_schema_version: 1,
            id: 'slice-f-publication',
            is_current: true,
            project_id: 'slice-f-project',
            published_at: '2026-08-05T05:00:00.000Z',
            revision,
            slug: 'nadia-raka',
            snapshot: {
              draft: {
                ...savedDraft.content,
                hero: { ...savedDraft.content.hero, title: 'Versi terbit Nadia & Raka' },
              },
              project: {
                eventCity: 'Bandung',
                eventDatePrimary: '2027-06-12',
                slug: 'nadia-raka',
                timezone: 'Asia/Jakarta',
              },
            },
            template_id: savedDraft.content.templateKey,
          }
        : null,
    [hasPublishedSnapshot, revision, savedDraft.content],
  );
  const readiness = useMemo<InvitationReadinessV1>(
    () => ({
      identity: {
        coupleLabel: 'Nadia & Raka',
        templateKey: savedDraft.content.templateKey,
      },
      invitation: {
        hasPublishedSnapshot,
        hasUnpublishedChanges: readinessState === 'published_with_unpublished_changes',
        hasVerifiedActivation: readinessState !== 'draft_ready_unactivated',
        publishedSlug: publishedSnapshot?.slug ?? null,
        state: readinessState,
      },
    }),
    [hasPublishedSnapshot, publishedSnapshot?.slug, readinessState, savedDraft.content.templateKey],
  );
  const paymentOverview = useMemo<PaymentOverview>(
    () => ({
      configuration: {
        amountIdr: 149000,
        currency: 'IDR',
        pricingVersion: 'v1',
        productCode: 'invitation_activation',
      },
      isConfigured: true,
      payment:
        readinessState === 'draft_ready_unactivated'
          ? null
          : { createdAt: '2026-08-05T00:00:00.000Z', status: 'paid' },
      publishEligibility:
        readinessState === 'draft_ready_unactivated'
          ? { allowed: false, reason: 'payment_required' }
          : { allowed: true, reason: 'verified_payment' },
    }),
    [readinessState],
  );

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
          initialMode={parseInvitationStudioMode(searchParams.get('mode') ?? 'publish')}
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
