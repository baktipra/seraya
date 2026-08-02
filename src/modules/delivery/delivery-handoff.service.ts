import 'server-only';

import { requireCurrentUser } from '@/modules/auth/current-user';
import { listGuestFollowUpEventsForVerifiedProject } from '@/modules/follow-up/follow-up.repository';
import { getOwnedProjectById, type OwnedProject } from '@/modules/projects/project.repository';

import {
  createDeliveryHandoffSummary,
  projectInitialHandoffTruth,
} from './delivery-distribution';
import { getGuestDeliveryCenterForVerifiedProject } from './delivery.service';
import type { OwnedGuestDistributionCenter } from './delivery.types';

/**
 * Bagikan-only composition. It layers truthful initial-handoff activity onto
 * the locked delivery-readiness authority without changing the base read model.
 */
export async function getGuestDistributionCenterForVerifiedProject(
  project: OwnedProject,
): Promise<OwnedGuestDistributionCenter> {
  const [deliveryCenter, events] = await Promise.all([
    getGuestDeliveryCenterForVerifiedProject(project),
    listGuestFollowUpEventsForVerifiedProject(project),
  ]);
  const rows = projectInitialHandoffTruth(deliveryCenter.rows, events);

  return {
    ...deliveryCenter,
    handoffSummary: createDeliveryHandoffSummary(rows),
    rows,
  };
}

export async function getGuestDistributionCenterForCurrentUser(projectId: string) {
  const user = await requireCurrentUser();
  const project = await getOwnedProjectById(projectId, user.id);
  return getGuestDistributionCenterForVerifiedProject(project);
}
