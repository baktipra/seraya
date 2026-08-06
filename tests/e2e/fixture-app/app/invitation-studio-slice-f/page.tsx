import { parseInvitationStudioMode } from '../../../../../src/components/projects/invitation-studio.types';
import { createDefaultInvitationDraftContent } from '../../../../../src/modules/invitations/invitation-draft.defaults';
import type { InvitationDraft } from '../../../../../src/modules/invitations/invitation-draft.types';
import type { PaymentOverview } from '../../../../../src/modules/payments';
import type { PublishedInvitationSnapshot } from '../../../../../src/modules/publications/publication.types';
import type {
  InvitationReadinessState,
  InvitationReadinessV1,
} from '../../../../../src/modules/readiness';

import { InvitationStudioSliceFFixture } from './fixture-client';

type FixtureSearchParams = {
  mode?: string | string[];
  revision?: string | string[];
  state?: string | string[];
};

const readinessStates: readonly InvitationReadinessState[] = [
  'draft_incomplete',
  'draft_ready_unactivated',
  'ready_to_publish',
  'published',
  'published_with_unpublished_changes',
];

function getSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseReadinessState(value: string | string[] | undefined): InvitationReadinessState {
  const candidate = getSearchParam(value);

  return readinessStates.includes(candidate as InvitationReadinessState)
    ? (candidate as InvitationReadinessState)
    : 'ready_to_publish';
}

function parseRevision(value: string | string[] | undefined) {
  const revision = Number(getSearchParam(value) ?? '3');
  return Number.isInteger(revision) && revision > 0 ? revision : 3;
}

export default async function InvitationStudioSliceFFixturePage({
  searchParams,
}: {
  searchParams?: Promise<FixtureSearchParams>;
}) {
  const query = await (searchParams ?? Promise.resolve<FixtureSearchParams>({}));
  const readinessState = parseReadinessState(query.state);
  const revision = parseRevision(query.revision);
  const hasPublishedSnapshot =
    readinessState === 'published' || readinessState === 'published_with_unpublished_changes';
  const content = createDefaultInvitationDraftContent({
    default_timezone: 'Asia/Jakarta',
    event_date_primary: '2027-06-12',
    person_one_name: 'Nadia',
    person_two_name: 'Raka',
  });
  const savedDraft: InvitationDraft = {
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
  const publishedSnapshot: PublishedInvitationSnapshot | null = hasPublishedSnapshot
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
    : null;
  const readiness: InvitationReadinessV1 = {
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
  };
  const paymentOverview: PaymentOverview = {
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
  };

  return (
    <main className="bg-seraya-canvas min-h-screen px-0 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-[96rem]">
        <InvitationStudioSliceFFixture
          initialMode={parseInvitationStudioMode(query.mode ?? 'publish')}
          paymentOverview={paymentOverview}
          publishedSnapshot={publishedSnapshot}
          readiness={readiness}
          savedDraft={savedDraft}
        />
      </div>
    </main>
  );
}
