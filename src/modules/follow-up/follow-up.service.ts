import 'server-only';

import { requireCurrentUser } from '@/modules/auth/current-user';
import { getGuestDeliveryCenterForVerifiedProject } from '@/modules/delivery/delivery.service';
import { reaccessPersonalGuestLinkForVerifiedGuest } from '@/modules/guest-links/guest-link.service';
import { assertGuestBelongsToProject } from '@/modules/guests/guest.policy';
import { getActiveGuestForVerifiedProjectWithAdmin } from '@/modules/guests/guest.repository';
import { isCanonicalGuestWhatsAppPhoneE164 } from '@/modules/guests/whatsapp-phone';
import { getOwnedProjectById, type OwnedProject } from '@/modules/projects/project.repository';
import { getCurrentPublishedInvitationForVerifiedProject } from '@/modules/publications/publication.repository';

import {
  appendGuestFollowUpEventForVerifiedProject,
  listGuestFollowUpEventsForVerifiedProject,
} from './follow-up.repository';
import { buildGuestFollowUpHandoff } from './follow-up-handoff';
import { createFollowUpGuestRows, createGuestFollowUpSummary } from './follow-up-segmentation';
import type {
  AppendGuestFollowUpEventInput,
  FollowUpGuestRow,
  GuestFollowUpEvent,
  GuestFollowUpHandoffMessageKind,
  GuestFollowUpHandoffResult,
  OwnedGuestFollowUpCenter,
} from './follow-up.types';
import { normalizeGuestFollowUpMetadata } from './follow-up.validation';

export class GuestFollowUpPublicationRequiredError extends Error {
  constructor() {
    super('A published invitation is required before preparing a follow-up handoff.');
    this.name = 'GuestFollowUpPublicationRequiredError';
  }
}

export class GuestFollowUpHandoffNotEligibleError extends Error {
  constructor() {
    super('The requested follow-up handoff is not eligible for this guest.');
    this.name = 'GuestFollowUpHandoffNotEligibleError';
  }
}

export class GuestFollowUpRsvpUnavailableError extends Error {
  constructor() {
    super('RSVP confirmation is not enabled in the published invitation.');
    this.name = 'GuestFollowUpRsvpUnavailableError';
  }
}

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

function isHandoffEligible(row: FollowUpGuestRow, messageKind: GuestFollowUpHandoffMessageKind) {
  if (messageKind === 'initial_invitation') return row.eligibility.canPrepareInitialInvitation;
  if (messageKind === 'rsvp_reminder') return row.eligibility.canPrepareRsvpReminder;
  return row.eligibility.canPrepareEventReminder;
}

/**
 * Manual handoff authority. A browser receives temporary compose material only
 * after the truthful `handoff_prepared` event is appended.
 */
export async function prepareGuestFollowUpHandoffForVerifiedProject(input: {
  guestId: string;
  messageKind: GuestFollowUpHandoffMessageKind;
  preparedAt?: Date;
  project: OwnedProject;
  sourceSurface?: 'delivery_center' | 'follow_up_center';
}): Promise<GuestFollowUpHandoffResult> {
  const [center, snapshot, guestCandidate] = await Promise.all([
    getGuestFollowUpCenterForVerifiedProject(input.project),
    getCurrentPublishedInvitationForVerifiedProject(input.project),
    getActiveGuestForVerifiedProjectWithAdmin(input.project, input.guestId),
  ]);
  const guest = assertGuestBelongsToProject(guestCandidate, input.project.id);

  if (!center.isPublished || !snapshot) {
    throw new GuestFollowUpPublicationRequiredError();
  }

  const row = center.rows.find((candidate: FollowUpGuestRow) => candidate.guestId === guest.id);
  if (!row || !isHandoffEligible(row, input.messageKind)) {
    throw new GuestFollowUpHandoffNotEligibleError();
  }

  if (input.messageKind === 'rsvp_reminder' && !snapshot.snapshot.draft.rsvp.enabled) {
    throw new GuestFollowUpRsvpUnavailableError();
  }

  const recipientWhatsAppPhoneE164 = guest.whatsapp_phone_e164;
  if (
    !recipientWhatsAppPhoneE164 ||
    !isCanonicalGuestWhatsAppPhoneE164(recipientWhatsAppPhoneE164)
  ) {
    throw new GuestFollowUpHandoffNotEligibleError();
  }

  const capability = await reaccessPersonalGuestLinkForVerifiedGuest({
    guest,
    project: input.project,
  });
  const preparedAt = input.preparedAt ?? new Date();
  const preparedAtIso = preparedAt.toISOString();
  const handoff = buildGuestFollowUpHandoff({
    guestDisplayName: guest.display_name,
    messageKind: input.messageKind,
    personalUrl: capability.personalUrl,
    preparedAt: preparedAtIso,
    recipientWhatsAppPhoneE164,
    snapshot: snapshot.snapshot,
  });

  await appendGuestFollowUpEventForVerifiedProject({
    channel: 'whatsapp',
    eventType: 'handoff_prepared',
    guestId: guest.id,
    messageKind: input.messageKind,
    metadata: {
      sourceSurface: input.sourceSurface ?? 'follow_up_center',
      templateVersion: 'manual-handoff-v1',
    },
    occurredAt: preparedAtIso,
    project: input.project,
  });

  return handoff;
}

export async function prepareGuestFollowUpHandoffForCurrentUser(input: {
  guestId: string;
  messageKind: GuestFollowUpHandoffMessageKind;
  preparedAt?: Date;
  projectId: string;
  sourceSurface?: 'delivery_center' | 'follow_up_center';
}): Promise<GuestFollowUpHandoffResult> {
  const user = await requireCurrentUser();
  const project = await getOwnedProjectById(input.projectId, user.id);

  return prepareGuestFollowUpHandoffForVerifiedProject({
    guestId: input.guestId,
    messageKind: input.messageKind,
    preparedAt: input.preparedAt,
    project,
    sourceSurface: input.sourceSurface,
  });
}
