import 'server-only';

import { requireCurrentUser } from '@/modules/auth/current-user';
import { isValidPersonalGuestToken } from '@/modules/guest-links/guest-link-token';
import { isSafePublicInvitationSlug } from '@/modules/publications/public-invitation.repository';
import { getOwnedProjectById, type OwnedProject } from '@/modules/projects/project.repository';

import {
  GuestbookRepositoryError,
  listGuestbookEntriesForVerifiedProject,
  listPersonalGuestbookSharedWishesRecords,
  mapPersonalGuestbookEntryRecord,
  mapPersonalGuestbookSharedWishRecord,
  resolvePersonalGuestbookEntryRecord,
  setGuestbookEntryFeedHiddenForVerifiedProject,
  softRemoveGuestbookEntryForVerifiedProject,
  submitPersonalGuestbookEntryRecord,
} from './guestbook.repository';
import type {
  OwnedGuestbookInbox,
  PersonalGuestbookEntry,
  PersonalGuestbookSharedWish,
} from './guestbook.types';

export class GuestbookUnavailableError extends Error {
  constructor() {
    super('The guestbook resource is unavailable.');
    this.name = 'GuestbookUnavailableError';
  }
}

export async function getGuestbookInboxForVerifiedProject(project: OwnedProject): Promise<OwnedGuestbookInbox> {
  const entries = await listGuestbookEntriesForVerifiedProject(project);
  return { entries, project: { defaultTimezone: project.default_timezone, id: project.id } };
}

export async function getGuestbookInboxForCurrentUser(projectId: string): Promise<OwnedGuestbookInbox> {
  const user = await requireCurrentUser();
  const project = await getOwnedProjectById(projectId, user.id);
  return getGuestbookInboxForVerifiedProject(project);
}

export async function softRemoveGuestbookEntryForCurrentUser(input: { entryId: string; projectId: string }): Promise<void> {
  const user = await requireCurrentUser();
  const project = await getOwnedProjectById(input.projectId, user.id);
  await softRemoveGuestbookEntryForVerifiedProject({ entryId: input.entryId, project });
}

export async function setGuestbookEntryFeedHiddenForCurrentUser(input: {
  entryId: string;
  hidden: boolean;
  projectId: string;
}): Promise<void> {
  const user = await requireCurrentUser();
  const project = await getOwnedProjectById(input.projectId, user.id);
  await setGuestbookEntryFeedHiddenForVerifiedProject({ entryId: input.entryId, hidden: input.hidden, project });
}

export async function getPersonalGuestbookEntryByToken(input: { slug: string; token: string }): Promise<PersonalGuestbookEntry | null> {
  if (!isSafePublicInvitationSlug(input.slug) || !isValidPersonalGuestToken(input.token)) return null;
  try {
    return mapPersonalGuestbookEntryRecord(await resolvePersonalGuestbookEntryRecord(input));
  } catch (error) {
    if (error instanceof GuestbookRepositoryError) return null;
    throw error;
  }
}

export async function getPersonalGuestbookSharedWishesByToken(input: {
  slug: string;
  token: string;
}): Promise<PersonalGuestbookSharedWish[]> {
  if (!isSafePublicInvitationSlug(input.slug) || !isValidPersonalGuestToken(input.token)) return [];
  try {
    const records = await listPersonalGuestbookSharedWishesRecords(input);
    return records.flatMap((record) => {
      const wish = mapPersonalGuestbookSharedWishRecord(record);
      return wish ? [wish] : [];
    });
  } catch (error) {
    if (error instanceof GuestbookRepositoryError) return [];
    throw error;
  }
}

export async function submitPersonalGuestbookEntry(input: {
  message: string;
  shareWithGuests: boolean;
  slug: string;
  token: string;
}): Promise<'created' | 'updated' | null> {
  if (!isSafePublicInvitationSlug(input.slug) || !isValidPersonalGuestToken(input.token)) return null;
  try {
    return await submitPersonalGuestbookEntryRecord(input);
  } catch (error) {
    if (error instanceof GuestbookRepositoryError) return null;
    throw error;
  }
}

export function isGuestbookRepositoryFailure(error: unknown) {
  return error instanceof GuestbookRepositoryError || error instanceof GuestbookUnavailableError;
}
