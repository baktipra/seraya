import 'server-only';

import type { Guest } from './guest.types';

export class GuestAccessDeniedError extends Error {
  constructor() {
    super('Guest was not found or is not accessible for the current project.');
    this.name = 'GuestAccessDeniedError';
  }
}

type ProjectScopedActiveGuest = Pick<Guest, 'deleted_at' | 'project_id'>;

/** Defense in depth for privileged server mutation paths. */
export function assertGuestBelongsToProject<T extends ProjectScopedActiveGuest>(
  guest: T | null,
  projectId: string,
): T {
  if (!guest || guest.project_id !== projectId || guest.deleted_at !== null) {
    throw new GuestAccessDeniedError();
  }

  return guest;
}
