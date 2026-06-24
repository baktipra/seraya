import 'server-only';

import { requireCurrentUser } from '@/modules/auth/current-user';
import { listActiveGuestsForVerifiedProject } from '@/modules/guests/guest.repository';
import { getCurrentPublishedInvitationForVerifiedProject } from '@/modules/publications/publication.service';
import type { PublishedInvitationSnapshot } from '@/modules/publications/publication.types';
import { getOwnedProjectById, type OwnedProject } from '@/modules/projects/project.repository';

import { getActiveInvitationDraftForVerifiedProject } from './invitation-draft.repository';
import type { InvitationDraft } from './invitation-draft.types';

export type OwnedProjectInvitationOverview = {
  draft: InvitationDraft | null;
  guestCount: number;
  publication: PublishedInvitationSnapshot | null;
  project: OwnedProject;
};

/**
 * Narrow private draft read model for owner-only routes that render the
 * active draft but do not need publication or guest data. The caller must
 * already hold a server-verified project context.
 */
export type OwnedProjectPrivateInvitationDraft = {
  draft: InvitationDraft | null;
  project: OwnedProject;
};

export async function getOwnedProjectPrivateInvitationDraftForVerifiedProject(
  project: OwnedProject,
): Promise<OwnedProjectPrivateInvitationDraft> {
  const draft = await getActiveInvitationDraftForVerifiedProject(project);

  return { draft, project };
}

/**
 * Private read model after a route or caller has already established a
 * server-owned project scope. It does not accept a browser-supplied account.
 */
export async function getOwnedProjectInvitationOverviewForVerifiedProject(
  project: OwnedProject,
): Promise<OwnedProjectInvitationOverview> {
  const [draft, publication, guests] = await Promise.all([
    getActiveInvitationDraftForVerifiedProject(project),
    getCurrentPublishedInvitationForVerifiedProject(project),
    listActiveGuestsForVerifiedProject(project),
  ]);

  return { draft, guestCount: guests.length, publication, project };
}

/**
 * Secure standalone private overview loader. Server Actions, route handlers,
 * and other non-dashboard-RSC callers retain fresh authentication and owner
 * verification before the verified-project loader runs.
 */
export async function getOwnedProjectInvitationOverview(
  projectId: string,
): Promise<OwnedProjectInvitationOverview> {
  const user = await requireCurrentUser();
  const project = await getOwnedProjectById(projectId, user.id);

  return getOwnedProjectInvitationOverviewForVerifiedProject(project);
}
