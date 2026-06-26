import { notFound } from 'next/navigation';

import { GuestDeliveryCenter } from '@/components/projects/guest-delivery-center';
import { getOwnedProjectContextForRequest } from '@/modules/auth/dashboard-request-context';
import { preparePersonalGuestLinkForDeliveryAction } from '@/modules/delivery/delivery.actions';
import { getGuestDeliveryCenterForVerifiedProject } from '@/modules/delivery/delivery.service';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

type DeliveryCenterPageProps = {
  params: Promise<{ projectId: string }>;
};

// Delivery readiness is private operational data and must always load fresh.
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

async function loadDeliveryCenter(projectId: string) {
  try {
    const project = await getOwnedProjectContextForRequest(projectId);
    return await getGuestDeliveryCenterForVerifiedProject(project);
  } catch (error) {
    if (error instanceof ProjectAccessDeniedError) {
      notFound();
    }

    throw error;
  }
}

export default async function DeliveryCenterPage({ params }: DeliveryCenterPageProps) {
  const { projectId } = await params;
  const deliveryCenter = await loadDeliveryCenter(projectId);

  return (
    <GuestDeliveryCenter
      isPublished={deliveryCenter.isPublished}
      projectId={deliveryCenter.project.id}
      rows={deliveryCenter.rows.map(({ guestId, ...row }, rowKey) => ({
        ...row,
        prepareAction: preparePersonalGuestLinkForDeliveryAction.bind(null, {
          guestId,
          projectId: deliveryCenter.project.id,
        }),
        rowKey,
      }))}
      summary={deliveryCenter.summary}
    />
  );
}
