import 'server-only';

import { requireCurrentUser } from '@/modules/auth/current-user';
import { getPaymentOverviewForVerifiedProject } from '@/modules/payments/payment.service';
import { getOwnedProjectById } from '@/modules/projects/project.repository';

import {
  getCurrentPublishedInvitationForVerifiedProject,
  PublicationPaymentRequiredError,
  publishInvitationSnapshot,
} from './publication.repository';

export type PublishedInvitationResult = {
  previousGalleryImageIds: string[];
  snapshot: Awaited<ReturnType<typeof publishInvitationSnapshot>>;
};

/**
 * M0011 is the final entitlement authority. This service check keeps the UI
 * and Server Action honest before the RPC is called, while M0011 repeats it
 * transactionally to prevent direct authenticated RPC bypass. SRY-009 keeps
 * prior gallery IDs for public-media cache invalidation after republish.
 */
export async function publishInvitationForCurrentUser(
  projectId: string,
): Promise<PublishedInvitationResult> {
  const user = await requireCurrentUser();
  const project = await getOwnedProjectById(projectId, user.id);
  const paymentOverview = await getPaymentOverviewForVerifiedProject(project);

  if (!paymentOverview.publishEligibility.allowed) {
    throw new PublicationPaymentRequiredError();
  }

  const previousSnapshot = await getCurrentPublishedInvitationForVerifiedProject(project);
  const snapshot = await publishInvitationSnapshot(projectId);

  return {
    previousGalleryImageIds: previousSnapshot?.snapshot.draft.gallery.imageIds ?? [],
    snapshot,
  };
}

export { getCurrentPublishedInvitationForVerifiedProject };
