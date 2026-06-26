import 'server-only';

import { requireCurrentUser } from '@/modules/auth/current-user';
import { isSafePublicInvitationSlug } from '@/modules/publications/public-invitation.repository';
import { getOwnedProjectById, type OwnedProject } from '@/modules/projects/project.repository';

import { isValidPersonalGuestToken } from '@/modules/guest-links/guest-link-token';

import {
  GuestbookRepositoryError,
  listGuestbookEntriesForVerifiedProject,
  mapPersonalGuestbookEntryRecord,
  resolvePersonalGuestbookEntryRecord,
  softRemoveGuestbookEntryForVerifiedProject,
  submitPersonalGuestbookEntryRecord,
} from './guestbook.repository';
import type { OwnedGuestbookInbox, PersonalGuestbookEntry } from './guestbook.types';

export class GuestbookUnavailableError extends Error {
  constructor() {
    super('The guestbook resource is unavailable.');
    this.name = 'GuestbookUnavailableError';
  }
}

export async function getGuestbookInboxForVerifiedProject(
  project: OwnedProject,
): Promise<OwnedGuestbookInbox> {
  const entries = await listGuestbookEntriesForVerifiedProject(project);

  return {
    entries,
    project: {
      defaultTimezone: project.default_timezone,
      id: project.id,
    },
  };
}

/** Standalone owner-only wrapper for non-RSC callers. */
export async function getGuestbookInboxForCurrentUser(
  projectId: string,
): Promise<OwnedGuestbookInbox> {
  const user = await requireCurrentUser();
  const project = await getOwnedProjectById(projectId, user.id);
  return getGuestbookInboxForVerifiedProject(project);
}

export async function softRemoveGuestbookEntryForCurrentUser(input: {
  entryId: string;
  projectId: string;
}): Promise<void> {
  const user = await requireCurrentUser();
  const project = await getOwnedProjectById(input.projectId, user.id);
  await softRemoveGuestbookEntryForVerifiedProject({ entryId: input.entryId, project });
}

/** Personal capability query. Null is intentionally generic for all invalid/unavailable states. */
export async function getPersonalGuestbookEntryByToken(input: {
  slug: string;
  token: string;
}): Promise<PersonalGuestbookEntry | null> {
  if (!isSafePublicInvitationSlug(input.slug) || !isValidPersonalGuestToken(input.token)) {
    return null;
  }

  try {
    return mapPersonalGuestbookEntryRecord(await resolvePersonalGuestbookEntryRecord(input));
  } catch (error) {
    if (error instanceof GuestbookRepositoryError) {
      return null;
    }

    throw error;
  }
}

/** Personal capability mutation. The database resolves the active guest itself. */
export async function submitPersonalGuestbookEntry(input: {
  message: string;
  slug: string;
  token: string;
}): Promise<'created' | 'updated' | null> {
  if (!isSafePublicInvitationSlug(input.slug) || !isValidPersonalGuestToken(input.token)) {
    return null;
  }

  try {
    return await submitPersonalGuestbookEntryRecord(input);
  } catch (error) {
    if (error instanceof GuestbookRepositoryError) {
      return null;
    }

    throw error;
  }
}

export function isGuestbookRepositoryFailure(error: unknown) {
  return error instanceof GuestbookRepositoryError || error instanceof GuestbookUnavailableError;
}
