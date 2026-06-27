import 'server-only';

import { requireCurrentUser } from '@/modules/auth/current-user';
import { listGuestLinkStatesForVerifiedGuestIds } from '@/modules/guest-links/guest-link.repository';
import type {
  GuestLinkStateRecord,
  GuestPersonalLinkState,
} from '@/modules/guest-links/guest-link.types';
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

function mapGuestLinkStates(records: GuestLinkStateRecord[]) {
  const states = new Map<string, GuestPersonalLinkState>();

  for (const record of records) {
    const current = states.get(record.guest_id);

    if (record.status === 'active') {
      states.set(record.guest_id, 'active');
    } else if (!current) {
      states.set(record.guest_id, 'revoked');
    }
  }

  return states;
}

/** Loads active guests plus factual operational state after verified server project scope. */
export async function getGuestManagerForVerifiedProject(
  project: OwnedProject,
): Promise<OwnedGuestManager> {
  const guests = await listActiveGuestsForVerifiedProject(project);
  const linkStates = mapGuestLinkStates(
    await listGuestLinkStatesForVerifiedGuestIds(guests.map((guest) => guest.id)),
  );

  return {
    guests: guests.map((guest) => mapGuestListItem(guest, linkStates.get(guest.id))),
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
