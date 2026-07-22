import { notFound } from 'next/navigation';

import { GuestManager } from '@/components/projects/guest-manager';
import { WorkspacePage } from '@/components/workspace/workspace-page';
import { getOwnedProjectContextForRequest } from '@/modules/auth/dashboard-request-context';
import { prepareMissingPersonalGuestLinksForDeliveryAction } from '@/modules/delivery/delivery.actions';
import { getGuestManagerForVerifiedProject } from '@/modules/guests/guest.service';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

type GuestsPageProps = {
  params: Promise<{ projectId: string }>;
};

export const dynamic = 'force-dynamic';

async function loadGuestManager(projectId: string) {
  try {
    const project = await getOwnedProjectContextForRequest(projectId);
    return await getGuestManagerForVerifiedProject(project);
  } catch (error) {
    if (error instanceof ProjectAccessDeniedError) {
      notFound();
    }

    throw error;
  }
}

export default async function GuestsPage({ params }: GuestsPageProps) {
  const { projectId } = await params;
  const manager = await loadGuestManager(projectId);

  return (
    <WorkspacePage width="operations">
      <GuestManager
        initialGuests={manager.guests}
        prepareBatchAction={prepareMissingPersonalGuestLinksForDeliveryAction.bind(null, {
          projectId: manager.project.id,
        })}
        projectId={manager.project.id}
      />
    </WorkspacePage>
  );
}
