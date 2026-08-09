import type { Route } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { CanonicalGuestFollowUpCenter } from '@/components/projects/canonical-guest-follow-up-center';
import { NativeGuestDeliveryCenter } from '@/components/projects/native-guest-delivery-center';
import { PublicSocialShareKit } from '@/components/projects/public-social-share-kit';
import {
  OperationalDataSurface,
  OperationalEmptyState,
  OperationalHeader,
  OperationalWorkspace,
} from '@/components/workspace/operational-primitives';
import { WorkspacePage } from '@/components/workspace/workspace-page';
import { measureWorkspaceServerLoad } from '@/lib/performance/workspace-performance.server';
import { getOwnedProjectContextForRequest } from '@/modules/auth/dashboard-request-context';
import { recordCanonicalInitialContactAction } from '@/modules/delivery/canonical-initial-contact.actions';
import { reaccessOrPrepareCanonicalInitialHandoffAction } from '@/modules/delivery/canonical-initial-handoff.actions';
import {
  copySelectedDeliveryWhatsAppNumbersAction,
  prepareMissingPersonalGuestLinksForDeliveryAction,
  preparePersonalGuestLinkForDeliveryAction,
} from '@/modules/delivery/delivery.actions';
import { deriveDeliveryDistribution } from '@/modules/delivery/delivery-distribution';
import { getGuestDistributionCenterForVerifiedProject } from '@/modules/delivery/delivery-handoff.service';
import { deriveDeliveryReadiness } from '@/modules/delivery/delivery-readiness';
import { prepareGuestFollowUpHandoffAction } from '@/modules/follow-up/follow-up.actions';
import { getGuestFollowUpCenterForVerifiedProject } from '@/modules/follow-up/follow-up.service';
import {
  guestFollowUpSegments,
  type GuestFollowUpSegmentFilter,
} from '@/modules/follow-up/follow-up.types';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';
import { getPublicSocialShareForVerifiedProject } from '@/modules/public-social-share/public-social-share.service';

type DeliveryCenterPageProps = {
  params: Promise<{ projectId: string }>;
  searchParams?: Promise<{
    filter?: string | string[];
    view?: string | string[];
  }>;
};

type DeliveryView = 'personal' | 'follow-up' | 'public';

type DeliveryScreen =
  | { kind: 'blocked' }
  | {
      kind: 'personal';
      deliveryCenter: Awaited<ReturnType<typeof getGuestDistributionCenterForVerifiedProject>>;
    }
  | {
      kind: 'follow-up';
      followUpCenter: Awaited<ReturnType<typeof getGuestFollowUpCenterForVerifiedProject>>;
    }
  | {
      kind: 'public';
      projectId: string;
      publicShare: NonNullable<Awaited<ReturnType<typeof getPublicSocialShareForVerifiedProject>>>;
    };

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

function getDeliveryView(value: string | string[] | undefined): DeliveryView {
  const resolved = Array.isArray(value) ? value[0] : value;
  if (resolved === 'follow-up') return 'follow-up';
  return resolved === 'public' ? 'public' : 'personal';
}

function getFollowUpFilter(value: string | string[] | undefined): GuestFollowUpSegmentFilter {
  const resolved = Array.isArray(value) ? value[0] : value;
  return guestFollowUpSegments.includes(resolved as (typeof guestFollowUpSegments)[number])
    ? (resolved as GuestFollowUpSegmentFilter)
    : 'all';
}

function DeliveryViewNavigation({ projectId, view }: { projectId: string; view: DeliveryView }) {
  const base = `/dashboard/${projectId}/delivery` as Route;
  const followUpHref = `${base}?view=follow-up` as Route;
  const publicHref = `${base}?view=public` as Route;

  return (
    <nav
      aria-label="Tampilan Bagikan"
      className="border-seraya-border-subtle bg-seraya-surface mb-5 flex min-w-0 flex-wrap rounded-[var(--seraya-radius-md)] border p-1"
      data-delivery-view-navigation
    >
      <Link
        aria-current={view === 'personal' ? 'page' : undefined}
        className={`focus-visible:outline-seraya-focus-ring inline-flex min-h-11 items-center justify-center rounded-[calc(var(--seraya-radius-md)-0.2rem)] px-4 text-sm font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 ${
          view === 'personal'
            ? 'bg-seraya-action-primary text-seraya-text-inverse'
            : 'text-seraya-text-secondary hover:bg-seraya-surface-subtle hover:text-seraya-text-primary'
        }`}
        href={base}
      >
        Undangan Pribadi
      </Link>
      <Link
        aria-current={view === 'follow-up' ? 'page' : undefined}
        className={`focus-visible:outline-seraya-focus-ring inline-flex min-h-11 items-center justify-center rounded-[calc(var(--seraya-radius-md)-0.2rem)] px-4 text-sm font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 ${
          view === 'follow-up'
            ? 'bg-seraya-action-primary text-seraya-text-inverse'
            : 'text-seraya-text-secondary hover:bg-seraya-surface-subtle hover:text-seraya-text-primary'
        }`}
        href={followUpHref}
      >
        Tindak Lanjut
      </Link>
      <Link
        aria-current={view === 'public' ? 'page' : undefined}
        className={`focus-visible:outline-seraya-focus-ring inline-flex min-h-11 items-center justify-center rounded-[calc(var(--seraya-radius-md)-0.2rem)] px-4 text-sm font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 ${
          view === 'public'
            ? 'bg-seraya-action-primary text-seraya-text-inverse'
            : 'text-seraya-text-secondary hover:bg-seraya-surface-subtle hover:text-seraya-text-primary'
        }`}
        href={publicHref}
      >
        Story & QR Publik
      </Link>
    </nav>
  );
}

function DeliveryBlockedState({ projectId }: { projectId: string }) {
  return (
    <OperationalWorkspace labelledBy="delivery-blocked-title">
      <OperationalHeader
        description="Terbitkan versi undangan yang sudah kalian setujui sebelum menyiapkan pembagian manual untuk tamu atau membuat aset publik."
        eyebrow="Bagikan"
        title="Bagikan tersedia setelah undangan diterbitkan"
        titleId="delivery-blocked-title"
      />
      <OperationalDataSurface>
        <OperationalEmptyState
          action={
            <Link
              className="text-seraya-action-primary focus-visible:outline-seraya-focus-ring inline-flex min-h-11 items-center rounded-[var(--seraya-radius-sm)] text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-3"
              href={`/dashboard/${projectId}`}
            >
              Kembali ke Ringkasan
            </Link>
          }
          description="Bagikan akan terbuka setelah versi publik pertama tersedia."
          title="Undangan belum diterbitkan."
        />
      </OperationalDataSurface>
    </OperationalWorkspace>
  );
}

async function getDeliveryScreenOrNotFound(
  projectId: string,
  view: DeliveryView,
): Promise<DeliveryScreen> {
  return measureWorkspaceServerLoad(
    { operation: 'delivery-center-screen', workspace: 'delivery' },
    async () => {
      try {
        const project = await getOwnedProjectContextForRequest(projectId);
        const publicShare = await getPublicSocialShareForVerifiedProject(project);
        if (!publicShare) return { kind: 'blocked' };

        if (view === 'public') {
          return { kind: 'public', projectId: project.id, publicShare };
        }

        if (view === 'follow-up') {
          return {
            followUpCenter: await getGuestFollowUpCenterForVerifiedProject(project),
            kind: 'follow-up',
          };
        }

        return {
          deliveryCenter: await getGuestDistributionCenterForVerifiedProject(project),
          kind: 'personal',
        };
      } catch (error) {
        if (error instanceof ProjectAccessDeniedError) notFound();
        throw error;
      }
    },
  );
}

export default async function DeliveryCenterPage({
  params,
  searchParams,
}: DeliveryCenterPageProps) {
  const { projectId } = await params;
  const query = await (searchParams ??
    Promise.resolve<{ filter?: string | string[]; view?: string | string[] }>({}));
  const view = getDeliveryView(query.view);
  const followUpFilter = getFollowUpFilter(query.filter);
  const screen = await getDeliveryScreenOrNotFound(projectId, view);

  if (screen.kind === 'blocked') {
    return (
      <WorkspacePage kind="delivery" width="operations">
        <DeliveryBlockedState projectId={projectId} />
      </WorkspacePage>
    );
  }

  const canonicalProjectId =
    screen.kind === 'personal'
      ? screen.deliveryCenter.project.id
      : screen.kind === 'follow-up'
        ? screen.followUpCenter.project.id
        : screen.projectId;

  return (
    <WorkspacePage kind="delivery" width="operations">
      <DeliveryViewNavigation projectId={canonicalProjectId} view={view} />

      {screen.kind === 'public' ? (
        <PublicSocialShareKit model={screen.publicShare} projectId={screen.projectId} />
      ) : screen.kind === 'follow-up' ? (
        <CanonicalGuestFollowUpCenter
          initialFilter={followUpFilter}
          isPublished={screen.followUpCenter.isPublished}
          projectId={screen.followUpCenter.project.id}
          rows={screen.followUpCenter.rows.map((row) => ({
            ...row,
            ...(row.eligibility.canPrepareEventReminder || row.eligibility.canPrepareRsvpReminder
              ? {
                  handoffAction: prepareGuestFollowUpHandoffAction.bind(null, {
                    guestId: row.guestId,
                    projectId: screen.followUpCenter.project.id,
                  }),
                }
              : {}),
          }))}
          summary={screen.followUpCenter.summary}
          timezone={screen.followUpCenter.project.default_timezone}
        />
      ) : (
        <NativeGuestDeliveryCenter
          copyWhatsAppNumbersAction={copySelectedDeliveryWhatsAppNumbersAction.bind(null, {
            projectId: screen.deliveryCenter.project.id,
          })}
          handoffSummary={screen.deliveryCenter.handoffSummary}
          projectId={screen.deliveryCenter.project.id}
          prepareBatchAction={prepareMissingPersonalGuestLinksForDeliveryAction.bind(null, {
            projectId: screen.deliveryCenter.project.id,
          })}
          rows={screen.deliveryCenter.rows.map(({ guestId, ...row }, rowKey) => {
            const readiness = deriveDeliveryReadiness(row);
            const truth = deriveDeliveryDistribution(row);
            const bound = { guestId, projectId: screen.deliveryCenter.project.id };

            return {
              ...row,
              ...(readiness.canPrepareNewLink
                ? { prepareAction: preparePersonalGuestLinkForDeliveryAction.bind(null, bound) }
                : {}),
              ...(readiness.isReadyToDistribute
                ? {
                    reaccessAction: reaccessOrPrepareCanonicalInitialHandoffAction.bind(
                      null,
                      bound,
                    ),
                  }
                : {}),
              ...(truth.canRecordContact
                ? { contactAction: recordCanonicalInitialContactAction.bind(null, bound) }
                : {}),
              guestId,
              rowKey,
            };
          })}
          summary={screen.deliveryCenter.summary}
        />
      )}
    </WorkspacePage>
  );
}
