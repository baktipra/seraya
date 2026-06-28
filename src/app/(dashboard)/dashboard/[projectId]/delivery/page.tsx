import { notFound } from 'next/navigation';

import { GuestDeliveryCenter } from '@/components/projects/guest-delivery-center';
import { getOwnedProjectContextForRequest } from '@/modules/auth/dashboard-request-context';
import {
  copySelectedDeliveryWhatsAppNumbersAction,
  prepareMissingPersonalGuestLinksForDeliveryAction,
  preparePersonalGuestLinkForDeliveryAction,
  reaccessPersonalGuestLinkForDeliveryAction,
} from '@/modules/delivery/delivery.actions';
import { getGuestDeliveryCenterForVerifiedProject } from '@/modules/delivery/delivery.service';
import { getWeddingReadinessForRequest } from '@/modules/readiness';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

type DeliveryCenterPageProps = {
  params: Promise<{ projectId: string }>;
};

type DeliveryScreen =
  | { kind: 'blocked' }
  | {
      kind: 'delivery';
      deliveryCenter: Awaited<ReturnType<typeof getGuestDeliveryCenterForVerifiedProject>>;
    };

// Delivery readiness is private operational data and must always load fresh.
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

function DeliveryBlockedState({ projectId }: { projectId: string }) {
  return (
    <section aria-labelledby="delivery-blocked-title" className="mx-auto max-w-3xl">
      <div className="border-seraya-border-default bg-seraya-surface rounded-[var(--seraya-radius-lg)] border px-5 py-7 shadow-[var(--seraya-shadow-soft)] sm:px-7 sm:py-8">
        <p className="text-seraya-action-primary text-xs font-semibold tracking-[0.14em] uppercase">
          Bagikan
        </p>
        <h1 className="seraya-display-md mt-3" id="delivery-blocked-title">
          Bagikan tersedia setelah undangan diterbitkan
        </h1>
        <p className="text-seraya-text-secondary mt-3 max-w-xl text-base leading-7">
          Terbitkan versi undangan yang sudah kalian setujui sebelum menyiapkan undangan pribadi.
        </p>
        <a
          className="text-seraya-action-primary focus-visible:outline-seraya-focus-ring mt-5 inline-flex min-h-11 items-center rounded-[var(--seraya-radius-sm)] text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-3"
          href={`/dashboard/${projectId}`}
        >
          Kembali ke ringkasan
        </a>
      </div>
    </section>
  );
}

async function getDeliveryScreenOrNotFound(projectId: string): Promise<DeliveryScreen> {
  try {
    const readiness = await getWeddingReadinessForRequest(projectId);

    if (!readiness.invitation.hasPublishedSnapshot) {
      return { kind: 'blocked' };
    }

    const project = await getOwnedProjectContextForRequest(projectId);
    const deliveryCenter = await getGuestDeliveryCenterForVerifiedProject(project);

    return { deliveryCenter, kind: 'delivery' };
  } catch (error) {
    if (error instanceof ProjectAccessDeniedError) {
      notFound();
    }

    throw error;
  }
}

export default async function DeliveryCenterPage({ params }: DeliveryCenterPageProps) {
  const { projectId } = await params;
  const screen = await getDeliveryScreenOrNotFound(projectId);

  if (screen.kind === 'blocked') {
    return <DeliveryBlockedState projectId={projectId} />;
  }

  const { deliveryCenter } = screen;

  return (
    <GuestDeliveryCenter
      copyWhatsAppNumbersAction={copySelectedDeliveryWhatsAppNumbersAction.bind(null, {
        projectId: deliveryCenter.project.id,
      })}
      projectId={deliveryCenter.project.id}
      prepareBatchAction={prepareMissingPersonalGuestLinksForDeliveryAction.bind(null, {
        projectId: deliveryCenter.project.id,
      })}
      rows={deliveryCenter.rows.map(({ guestId, ...row }, rowKey) => ({
        ...row,
        prepareAction: preparePersonalGuestLinkForDeliveryAction.bind(null, {
          guestId,
          projectId: deliveryCenter.project.id,
        }),
        reaccessAction: reaccessPersonalGuestLinkForDeliveryAction.bind(null, {
          guestId,
          projectId: deliveryCenter.project.id,
        }),
        guestId,
        rowKey,
      }))}
      summary={deliveryCenter.summary}
    />
  );
}
