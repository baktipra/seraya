import { parseInvitationStudioMode } from '../../../../../src/components/projects/invitation-studio.types';
import { createDefaultInvitationDraftContent } from '../../../../../src/modules/invitations/invitation-draft.defaults';
import type { InvitationDraft } from '../../../../../src/modules/invitations/invitation-draft.types';
import type { PaymentOverview } from '../../../../../src/modules/payments';
import type { PublishedInvitationSnapshot } from '../../../../../src/modules/publications/publication.types';
import type {
  InvitationReadinessState,
  InvitationReadinessV1,
} from '../../../../../src/modules/readiness';

import { InvitationStudioSliceGFixture } from './fixture-client';

type FixtureSearchParams = {
  mode?: string | string[];
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
    : 'published_with_unpublished_changes';
}

export default async function InvitationStudioSliceGFixturePage({
  searchParams,
}: {
  searchParams?: Promise<FixtureSearchParams>;
}) {
  const query = await (searchParams ?? Promise.resolve<FixtureSearchParams>({}));
  const readinessState = parseReadinessState(query.state);
  const hasPublishedSnapshot =
    readinessState === 'published' || readinessState === 'published_with_unpublished_changes';
  const content = createDefaultInvitationDraftContent({
    default_timezone: 'Asia/Jakarta',
    event_date_primary: '2027-06-12',
    person_one_name: 'Nadia Maharani Prameswari',
    person_two_name: 'Raka Aditya Wiranegara',
  });
  const savedDraft: InvitationDraft = {
    content: {
      ...content,
      closing: {
        ...content.closing,
        enabled: true,
        message:
          'Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak, Ibu, Saudara, dan Saudari berkenan hadir serta memberikan doa restu.',
        signature: 'Nadia & Raka beserta keluarga besar',
      },
      hero: {
        ...content.hero,
        title:
          readinessState === 'draft_incomplete'
            ? ''
            : 'Nadia Maharani Prameswari & Raka Aditya Wiranegara',
      },
      rsvp: {
        ...content.rsvp,
        enabled: true,
        heading: 'Konfirmasi Kehadiran Keluarga dan Rombongan',
        lead:
          'Mohon konfirmasikan kehadiran agar kami dapat mempersiapkan penyambutan terbaik untuk Anda dan keluarga.',
      },
      story: {
        ...content.story,
        body:
          'Perjalanan panjang kami tumbuh dari percakapan sederhana, pertemuan keluarga, dan keyakinan untuk berjalan bersama.',
        enabled: true,
        heading: 'Cerita perjalanan kami menuju hari bahagia',
      },
    },
    created_at: '2026-08-06T00:00:00.000Z',
    deleted_at: null,
    id: 'slice-g-draft',
    project_id: 'slice-g-project',
    schema_version: 1,
    updated_at: '2026-08-06T09:30:00.000Z',
  };
  const publishedSnapshot: PublishedInvitationSnapshot | null = hasPublishedSnapshot
    ? {
        created_at: '2026-08-05T00:00:00.000Z',
        draft_schema_version: 1,
        id: 'slice-g-publication',
        is_current: true,
        project_id: 'slice-g-project',
        published_at: '2026-08-05T05:00:00.000Z',
        revision: 4,
        slug: 'nadia-raka-responsive-regression',
        snapshot: {
          draft: {
            ...savedDraft.content,
            hero: {
              ...savedDraft.content.hero,
              title: 'Versi terbit Nadia Maharani & Raka Aditya',
            },
          },
          project: {
            eventCity: 'Bandung',
            eventDatePrimary: '2027-06-12',
            slug: 'nadia-raka-responsive-regression',
            timezone: 'Asia/Jakarta',
          },
        },
        template_id: savedDraft.content.templateKey,
      }
    : null;
  const readiness: InvitationReadinessV1 = {
    identity: {
      coupleLabel: 'Nadia Maharani Prameswari & Raka Aditya Wiranegara',
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
    <main className="bg-seraya-canvas min-h-screen px-0 py-4 sm:px-4 sm:py-6 lg:px-8">
      <div className="mx-auto w-full max-w-[100rem]">
        <InvitationStudioSliceGFixture
          initialMode={parseInvitationStudioMode(query.mode ?? 'content')}
          paymentOverview={paymentOverview}
          publishedSnapshot={publishedSnapshot}
          readiness={readiness}
          savedDraft={savedDraft}
        />
      </div>
    </main>
  );
}
