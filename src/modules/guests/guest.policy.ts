import 'server-only';

import type { Guest } from './guest.types';

export class GuestAccessDeniedError extends Error {
  constructor() {
    super('Guest was not found or is not accessible for the current project.');
    this.name = 'GuestAccessDeniedError';
  }
}

/** Defense in depth for privileged server mutation paths. */
export function assertGuestBelongsToProject(guest: Guest | null, projectId: string): Guest {
  if (!guest || guest.project_id !== projectId || guest.deleted_at !== null) {
    throw new GuestAccessDeniedError();
  }

  return guest;
}
