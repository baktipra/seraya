import 'server-only';

import { requireCurrentUser } from '@/modules/auth/current-user';
import { createLatestGuestLinkLifecycleMap } from '@/modules/guest-links/guest-link-lifecycle';
import { listLatestGuestLinkStatesForVerifiedGuestIds } from '@/modules/guest-links/guest-link.repository';
import { getOwnedProjectById, type OwnedProject } from '@/modules/projects/project.repository';

import { mapGuestListItem } from './guest.mapper';
import { assertGuestBelongsToProject } from './guest.policy';
import {
  createGuestForVerifiedProject,
  createGuestsForVerifiedProject,
  getActiveGuestForVerifiedProjectWithAdmin,
  GuestRepositoryError,
  listActiveGuestsForVerifiedProject,
  softRemoveGuestForVerifiedProject,
  updateGuestForVerifiedProject,
} from './guest.repository';
import { parseGuestImportCsvFile, serializeGuestDirectoryCsv } from './guest-csv';
import { createGuestImportXlsxTemplate, parseGuestImportXlsxFile } from './guest-xlsx';
import { createGuestOperationsXlsx } from './guest-operations-xlsx';
import type { CreateGuestInput, GuestListItem, UpdateGuestInput } from './guest.types';

export class GuestUnavailableError extends Error {
  constructor() {
    super('The guest resource is unavailable.');
    this.name = 'GuestUnavailableError';
  }
}

/** Owner edits may not reduce an invited party below a submitted attendance count. */
export class GuestAttendanceCountConflictError extends Error {
  constructor() {
    super('The invited party size cannot be lower than the confirmed attendee count.');
    this.name = 'GuestAttendanceCountConflictError';
  }
}

export type OwnedGuestManager = {
  guests: GuestListItem[];
  project: OwnedProject;
};

/**
 * Loads active guests plus the same latest-state/recoverability lifecycle used
 * by downstream operational workspaces. No capability material enters this
 * owner-browser projection.
 */
export async function getGuestManagerForVerifiedProject(
  project: OwnedProject,
): Promise<OwnedGuestManager> {
  const guests = await listActiveGuestsForVerifiedProject(project);
  const lifecycleByGuest = createLatestGuestLinkLifecycleMap(
    await listLatestGuestLinkStatesForVerifiedGuestIds(guests.map((guest) => guest.id)),
  );

  return {
    guests: guests.map((guest) =>
      mapGuestListItem(guest, lifecycleByGuest.get(guest.id)?.lifecycleState),
    ),
    project,
  };
}

/** Standalone owner-scoped guest manager loader for non-RSC callers. */
export async function getGuestManagerForCurrentUser(projectId: string): Promise<OwnedGuestManager> {
  const user = await requireCurrentUser();
  const project = await getOwnedProjectById(projectId, user.id);

  return getGuestManagerForVerifiedProject(project);
}

export async function createGuestForCurrentUser(input: {
  guest: CreateGuestInput;
  projectId: string;
}): Promise<GuestListItem> {
  const user = await requireCurrentUser();
  const project = await getOwnedProjectById(input.projectId, user.id);
  const guest = await createGuestForVerifiedProject({ guest: input.guest, project });
  return mapGuestListItem(guest);
}

/** Parses every byte before invoking one controlled add-only batch insert. */
export async function importGuestCsvForCurrentUser(input: {
  file: File;
  projectId: string;
}): Promise<number> {
  const user = await requireCurrentUser();
  const project = await getOwnedProjectById(input.projectId, user.id);
  const guests = await parseGuestImportCsvFile(input.file);

  await createGuestsForVerifiedProject({ guests, project });
  return guests.length;
}

/** Parses the entire owner-uploaded XLSX before one controlled add-only batch insert. */
export async function importGuestXlsxForCurrentUser(input: {
  file: File;
  projectId: string;
}): Promise<number> {
  const user = await requireCurrentUser();
  const project = await getOwnedProjectById(input.projectId, user.id);
  const guests = await parseGuestImportXlsxFile(input.file);

  await createGuestsForVerifiedProject({ guests, project });
  return guests.length;
}

/** Owner-only XLSX template generation; it persists no uploaded files or guest data. */
export async function getGuestImportXlsxTemplateForCurrentUser(
  projectId: string,
): Promise<Uint8Array> {
  const user = await requireCurrentUser();
  await getOwnedProjectById(projectId, user.id);
  return createGuestImportXlsxTemplate();
}

/** Owner-only active-directory CSV, kept separate from guest link and RSVP data. */
export async function getGuestDirectoryCsvForCurrentUser(projectId: string): Promise<string> {
  const user = await requireCurrentUser();
  const project = await getOwnedProjectById(projectId, user.id);
  const guests = await listActiveGuestsForVerifiedProject(project);
  return serializeGuestDirectoryCsv(guests);
}

/** Owner-only XLSX operations export; selected IDs are intersected with verified active project rows. */
export async function getGuestOperationsXlsxForCurrentUser(input: {
  guestIds: string[];
  projectId: string;
}): Promise<Uint8Array> {
  const manager = await getGuestManagerForCurrentUser(input.projectId);
  const selected = new Set(input.guestIds);
  const guests =
    input.guestIds.length === 0
      ? manager.guests
      : manager.guests.filter((guest) => selected.has(guest.id));
  return createGuestOperationsXlsx(guests);
}

export async function updateGuestForCurrentUser(input: {
  guest: UpdateGuestInput;
  guestId: string;
  projectId: string;
}): Promise<GuestListItem> {
  const user = await requireCurrentUser();
  const project = await getOwnedProjectById(input.projectId, user.id);
  const existing = assertGuestBelongsToProject(
    await getActiveGuestForVerifiedProjectWithAdmin(project, input.guestId),
    project.id,
  );

  if (
    existing.rsvp_attendee_count !== null &&
    input.guest.partySize < existing.rsvp_attendee_count
  ) {
    throw new GuestAttendanceCountConflictError();
  }

  const guest = await updateGuestForVerifiedProject({
    guest: input.guest,
    guestId: input.guestId,
    project,
  });
  return mapGuestListItem(guest);
}

export async function softRemoveGuestForCurrentUser(input: {
  guestId: string;
  projectId: string;
}): Promise<void> {
  const user = await requireCurrentUser();
  const project = await getOwnedProjectById(input.projectId, user.id);
  const existing = await getActiveGuestForVerifiedProjectWithAdmin(project, input.guestId);
  assertGuestBelongsToProject(existing, project.id);
  await softRemoveGuestForVerifiedProject({ guestId: input.guestId, project });
}

/** Narrow conversion point for action UX; raw repository details never leave the server. */
export function isGuestRepositoryFailure(error: unknown) {
  return error instanceof GuestRepositoryError || error instanceof GuestUnavailableError;
}
