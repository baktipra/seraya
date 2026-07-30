import 'server-only';

import { getOwnedProjectContextForRequest } from '@/modules/auth/dashboard-request-context';

import { getProjectCoupleLabel } from './project.mapper';
import type { OwnedProject } from './project.repository';

export type ProjectShellV1 = {
  coupleLabel: string;
  statusLabel: string;
};

function getProjectShellStatusLabel(project: OwnedProject): string {
  if (project.status === 'archived') {
    return 'Proyek diarsipkan';
  }

  return 'Workspace aktif';
}

/**
 * Lightweight owner-verified projection for the persistent project shell.
 * The underlying request-local project context remains authoritative; this
 * projection deliberately avoids draft, publication, payment, guest, RSVP,
 * Guestbook, and delivery-readiness reads.
 */
export async function getProjectShellForRequest(projectId: string): Promise<ProjectShellV1> {
  const project = await getOwnedProjectContextForRequest(projectId);

  return {
    coupleLabel: getProjectCoupleLabel(project.person_one_name, project.person_two_name),
    statusLabel: getProjectShellStatusLabel(project),
  };
}
