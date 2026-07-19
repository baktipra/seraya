import 'server-only';

import { requireCurrentUser } from '@/modules/auth/current-user';
import { getGuestDeliveryCenterForVerifiedProject } from '@/modules/delivery/delivery.service';
import { assertGuestBelongsToProject } from '@/modules/guests/guest.policy';
import { getActiveGuestForVerifiedProjectWithAdmin } from '@/modules/guests/guest.repository';
import { getOwnedProjectById, type OwnedProject } from '@/modules/projects/project.repository';

import {
  appendGuestFollowUpEventForVerifiedProject,
  listGuestFollowUpEventsForVerifiedProject,
} from './follow-up.repository';
import { createFollowUpGuestRows, createGuestFollowUpSummary } from './follow-up-segmentation';
import type {
  AppendGuestFollowUpEventInput,
  GuestFollowUpEvent,
  OwnedGuestFollowUpCenter,
} from './follow-up.types';
import { normalizeGuestFollowUpMetadata } from './follow-up.validation';

export async function getGuestFollowUpEventsForVerifiedProject(
  project: OwnedProject,
): Promise<GuestFollowUpEvent[]> {
  return listGuestFollowUpEventsForVerifiedProject(project);
}

export async function getGuestFollowUpEventsForCurrentUser(
  projectId: string,
): Promise<GuestFollowUpEvent[]> {
  const user = await requireCurrentUser();
  const project = await getOwnedProjectById(projectId, user.id);
  return getGuestFollowUpEventsForVerifiedProject(project);
}

/**
 * Owner-only read model composed from the existing delivery authority and the
 * project-scoped M0021 event log. No raw capability or contact field is added.
 */
export async function getGuestFollowUpCenterForVerifiedProject(
  project: OwnedProject,
): Promise<OwnedGuestFollowUpCenter> {
  const [deliveryCenter, events] = await Promise.all([
    getGuestDeliveryCenterForVerifiedProject(project),
    listGuestFollowUpEventsForVerifiedProject(project),
  ]);
  const rows = createFollowUpGuestRows(deliveryCenter.rows, events);

  return {
    isPublished: deliveryCenter.isPublished,
    project,
    rows,
    summary: createGuestFollowUpSummary(rows),
  };
}

export async function getGuestFollowUpCenterForCurrentUser(
  projectId: string,
): Promise<OwnedGuestFollowUpCenter> {
  const user = await requireCurrentUser();
  const project = await getOwnedProjectById(projectId, user.id);
  return getGuestFollowUpCenterForVerifiedProject(project);
}

/**
 * Internal foundation for later handoff actions. This establishes ownership and
 * active-guest authority only; publication and RSVP eligibility are added by the
 * message-specific workflow in Slice C.
 */
export async function recordGuestFollowUpEventForVerifiedProject(input: {
  event: AppendGuestFollowUpEventInput;
  project: OwnedProject;
}): Promise<string> {
  const guest = assertGuestBelongsToProject(
    await getActiveGuestForVerifiedProjectWithAdmin(input.project, input.event.guestId),
    input.project.id,
  );
  const metadata = normalizeGuestFollowUpMetadata(input.event.metadata);
  const occurredAt = input.event.occurredAt ?? new Date();

  return appendGuestFollowUpEventForVerifiedProject({
    channel: input.event.channel,
    eventType: input.event.eventType,
    guestId: guest.id,
    messageKind: input.event.messageKind,
    metadata,
    occurredAt: occurredAt.toISOString(),
    project: input.project,
  });
}

export async function recordGuestFollowUpEventForCurrentUser(input: {
  event: AppendGuestFollowUpEventInput;
  projectId: string;
}): Promise<string> {
  const user = await requireCurrentUser();
  const project = await getOwnedProjectById(input.projectId, user.id);
  return recordGuestFollowUpEventForVerifiedProject({ event: input.event, project });
}
