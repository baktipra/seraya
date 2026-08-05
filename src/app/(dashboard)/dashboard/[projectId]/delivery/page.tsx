import Link from 'next/link';
import { notFound } from 'next/navigation';

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
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';
import { getPublicSocialShareForVerifiedProject } from '@/modules/public-social-share/public-social-share.service';

type DeliveryCenterPageProps = {
  params: Promise<{ projectId: string }>;
};

type DeliveryScreen =
  | { kind: 'blocked' }
  | {
      kind: 'delivery';
      deliveryCenter: Awaited<ReturnType<typeof getGuestDistributionCenterForVerifiedProject>>;
      publicShare: NonNullable<
        Awaited<ReturnType<typeof getPublicSocialShareForVerifiedProject>>
      >;
    };

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

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

async function getDeliveryScreenOrNotFound(projectId: string): Promise<DeliveryScreen> {
  return measureWorkspaceServerLoad(
    { operation: 'delivery-center-screen', workspace: 'delivery' },
    async () => {
      try {
        const project = await getOwnedProjectContextForRequest(projectId);
        const publicShare = await getPublicSocialShareForVerifiedProject(project);
        if (!publicShare) return { kind: 'blocked' };
        return {
          deliveryCenter: await getGuestDistributionCenterForVerifiedProject(project),
          kind: 'delivery',
          publicShare,
        };
      } catch (error) {
        if (error instanceof ProjectAccessDeniedError) notFound();
        throw error;
      }
    },
  );
}

export default async function DeliveryCenterPage({ params }: DeliveryCenterPageProps) {
  const { projectId } = await params;
  const screen = await getDeliveryScreenOrNotFound(projectId);

  if (screen.kind === 'blocked') {
    return (
      <WorkspacePage kind="delivery" width="operations">
        <DeliveryBlockedState projectId={projectId} />
      </WorkspacePage>
    );
  }

  const { deliveryCenter, publicShare } = screen;

  return (
    <WorkspacePage kind="delivery" width="operations">
      <PublicSocialShareKit
        model={publicShare}
        projectId={deliveryCenter.project.id}
      />
      <NativeGuestDeliveryCenter
        copyWhatsAppNumbersAction={copySelectedDeliveryWhatsAppNumbersAction.bind(null, {
          projectId: deliveryCenter.project.id,
        })}
        handoffSummary={deliveryCenter.handoffSummary}
        projectId={deliveryCenter.project.id}
        prepareBatchAction={prepareMissingPersonalGuestLinksForDeliveryAction.bind(null, {
          projectId: deliveryCenter.project.id,
        })}
        rows={deliveryCenter.rows.map(({ guestId, ...row }, rowKey) => {
          const readiness = deriveDeliveryReadiness(row);
          const truth = deriveDeliveryDistribution(row);
          const bound = { guestId, projectId: deliveryCenter.project.id };

          return {
            ...row,
            ...(readiness.canPrepareNewLink
              ? { prepareAction: preparePersonalGuestLinkForDeliveryAction.bind(null, bound) }
              : {}),
            ...(readiness.isReadyToDistribute
              ? {
                  reaccessAction: reaccessOrPrepareCanonicalInitialHandoffAction.bind(null, bound),
                }
              : {}),
            ...(truth.canRecordContact
              ? { contactAction: recordCanonicalInitialContactAction.bind(null, bound) }
              : {}),
            guestId,
            rowKey,
          };
        })}
        summary={deliveryCenter.summary}
      />
    </WorkspacePage>
  );
}
