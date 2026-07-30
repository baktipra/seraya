import Link from 'next/link';
import { notFound } from 'next/navigation';

import { NativeGuestDeliveryCenter } from '@/components/projects/native-guest-delivery-center';
import {
  OperationalDataSurface,
  OperationalEmptyState,
  OperationalHeader,
  OperationalWorkspace,
} from '@/components/workspace/operational-primitives';
import { WorkspacePage } from '@/components/workspace/workspace-page';
import { measureWorkspaceServerLoad } from '@/lib/performance/workspace-performance.server';
import { getOwnedProjectContextForRequest } from '@/modules/auth/dashboard-request-context';
import { reaccessOrPrepareCanonicalInitialHandoffAction } from '@/modules/delivery/canonical-initial-handoff.actions';
import {
  copySelectedDeliveryWhatsAppNumbersAction,
  prepareMissingPersonalGuestLinksForDeliveryAction,
  preparePersonalGuestLinkForDeliveryAction,
} from '@/modules/delivery/delivery.actions';
import { deriveDeliveryReadiness } from '@/modules/delivery/delivery-readiness';
import { getGuestDeliveryCenterForVerifiedProject } from '@/modules/delivery/delivery.service';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';
import { getCurrentPublishedInvitationForVerifiedProject } from '@/modules/publications/publication.service';

type DeliveryCenterPageProps = {
  params: Promise<{ projectId: string }>;
};

type DeliveryScreen =
  | { kind: 'blocked' }
  | {
      kind: 'delivery';
      deliveryCenter: Awaited<ReturnType<typeof getGuestDeliveryCenterForVerifiedProject>>;
    };

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

function DeliveryBlockedState({ projectId }: { projectId: string }) {
  return (
    <OperationalWorkspace labelledBy="delivery-blocked-title">
      <OperationalHeader
        description="Terbitkan versi undangan yang sudah kalian setujui sebelum menyiapkan Undangan Pribadi untuk tamu."
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
    {
      operation: 'delivery-center-screen',
      workspace: 'delivery',
    },
    async () => {
      try {
        const project = await getOwnedProjectContextForRequest(projectId);
        const publication = await getCurrentPublishedInvitationForVerifiedProject(project);

        if (!publication) {
          return { kind: 'blocked' };
        }

        const deliveryCenter = await getGuestDeliveryCenterForVerifiedProject(project);

        return { deliveryCenter, kind: 'delivery' };
      } catch (error) {
        if (error instanceof ProjectAccessDeniedError) {
          notFound();
        }

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

  const { deliveryCenter } = screen;

  return (
    <WorkspacePage kind="delivery" width="operations">
      <NativeGuestDeliveryCenter
        copyWhatsAppNumbersAction={copySelectedDeliveryWhatsAppNumbersAction.bind(null, {
          projectId: deliveryCenter.project.id,
        })}
        projectId={deliveryCenter.project.id}
        prepareBatchAction={prepareMissingPersonalGuestLinksForDeliveryAction.bind(null, {
          projectId: deliveryCenter.project.id,
        })}
        rows={deliveryCenter.rows.map(({ guestId, ...row }, rowKey) => {
          const readiness = deriveDeliveryReadiness(row);
          return {
            ...row,
            ...(readiness.canPrepareNewLink
              ? {
                  prepareAction: preparePersonalGuestLinkForDeliveryAction.bind(null, {
                    guestId,
                    projectId: deliveryCenter.project.id,
                  }),
                }
              : {}),
            ...(readiness.isReadyToDistribute
              ? {
                  reaccessAction: reaccessOrPrepareCanonicalInitialHandoffAction.bind(null, {
                    guestId,
                    projectId: deliveryCenter.project.id,
                  }),
                }
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
