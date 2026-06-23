import 'server-only';

import { requireCurrentUser } from '@/modules/auth/current-user';
import { getCurrentPublishedInvitationForVerifiedProject } from '@/modules/publications/publication.service';
import type { PublishedInvitationSnapshot } from '@/modules/publications/publication.types';
import { getOwnedProjectById } from '@/modules/projects/project.repository';
import { listActiveGuestsForVerifiedProject } from '@/modules/guests/guest.repository';

import { getActiveInvitationDraftForVerifiedProject } from './invitation-draft.repository';
import type { InvitationDraft } from './invitation-draft.types';

export type OwnedProjectInvitationOverview = {
  draft: InvitationDraft | null;
  guestCount: number;
  publication: PublishedInvitationSnapshot | null;
  project: Awaited<ReturnType<typeof getOwnedProjectById>>;
};

/**
 * Private overview loader. Project ownership is established first, then the
 * active draft and current owner-visible publication are loaded only through
 * the verified project record.
 */
export async function getOwnedProjectInvitationOverview(
  projectId: string,
): Promise<OwnedProjectInvitationOverview> {
  const user = await requireCurrentUser();
  const project = await getOwnedProjectById(projectId, user.id);
  const [draft, publication, guests] = await Promise.all([
    getActiveInvitationDraftForVerifiedProject(project),
    getCurrentPublishedInvitationForVerifiedProject(project),
    listActiveGuestsForVerifiedProject(project),
  ]);

  return { draft, guestCount: guests.length, publication, project };
}
