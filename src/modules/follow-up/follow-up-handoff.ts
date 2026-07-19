import {
  buildWhatsAppPersonalGuestHandoffUrl,
  normalizeWhatsAppGuestDisplayName,
} from '@/modules/guest-links/whatsapp-share';
import {
  formatInvitationDate,
  formatInvitationTime,
} from '@/modules/invitation-templates/invitation-date-formatters';
import type { PublishedInvitationSnapshotPayload } from '@/modules/publications/publication.types';

import type {
  GuestFollowUpHandoffMessageKind,
  GuestFollowUpHandoffResult,
} from './follow-up.types';

function requireGuestDisplayName(value: string) {
  const normalized = normalizeWhatsAppGuestDisplayName(value);

  if (!normalized) {
    throw new Error('Guest display name is required for a follow-up handoff.');
  }

  return normalized;
}

function buildInitialInvitationMessage(guestDisplayName: string, personalUrl: string) {
  return [
    `Halo ${guestDisplayName},`,
    '',
    'Kami mengundang Anda untuk hadir di acara pernikahan kami.',
    '',
    personalUrl,
  ].join('\n');
}

function buildRsvpReminderMessage(guestDisplayName: string, personalUrl: string) {
  return [
    `Halo ${guestDisplayName},`,
    '',
    'Kami ingin mengingatkan Anda untuk mengonfirmasi kehadiran melalui Undangan Pribadi berikut:',
    '',
    personalUrl,
    '',
    'Terima kasih.',
  ].join('\n');
}

function formatEventTime(startTime: string, endTime: string | null) {
  const start = formatInvitationTime(startTime);

  if (!start) {
    throw new Error('Published invitation event time is invalid.');
  }

  const end = formatInvitationTime(endTime);
  return end ? `pukul ${start}–${end}` : `pukul ${start}`;
}

function formatPublishedEvent(
  event: PublishedInvitationSnapshotPayload['draft']['eventSchedule']['events'][number],
  index: number,
) {
  const date = formatInvitationDate(event.date);

  if (!date) {
    throw new Error('Published invitation event date is invalid.');
  }

  return [
    `${index + 1}. ${event.title}`,
    `${date}, ${formatEventTime(event.startTime, event.endTime)}`,
    ...(event.venueName ? [event.venueName] : []),
    ...(event.venueAddress ? [event.venueAddress] : []),
  ].join('\n');
}

function buildEventReminderMessage(input: {
  guestDisplayName: string;
  personalUrl: string;
  snapshot: PublishedInvitationSnapshotPayload;
}) {
  const coupleName = [
    input.snapshot.draft.couple.personOne.displayName,
    input.snapshot.draft.couple.personTwo.displayName,
  ].join(' & ');
  const eventBlocks = input.snapshot.draft.eventSchedule.events.map(formatPublishedEvent);

  return [
    `Halo ${input.guestDisplayName},`,
    '',
    `Pengingat untuk rangkaian acara pernikahan ${coupleName}:`,
    '',
    eventBlocks.join('\n\n'),
    '',
    'Detail lengkap:',
    input.personalUrl,
    '',
    'Sampai bertemu.',
  ].join('\n');
}

export function buildGuestFollowUpHandoffMessage(input: {
  guestDisplayName: string;
  messageKind: GuestFollowUpHandoffMessageKind;
  personalUrl: string;
  snapshot: PublishedInvitationSnapshotPayload;
}) {
  const guestDisplayName = requireGuestDisplayName(input.guestDisplayName);

  if (input.messageKind === 'initial_invitation') {
    return buildInitialInvitationMessage(guestDisplayName, input.personalUrl);
  }

  if (input.messageKind === 'rsvp_reminder') {
    return buildRsvpReminderMessage(guestDisplayName, input.personalUrl);
  }

  return buildEventReminderMessage({
    guestDisplayName,
    personalUrl: input.personalUrl,
    snapshot: input.snapshot,
  });
}

/**
 * Creates a temporary WhatsApp handoff payload. The caller must append the
 * truthful `handoff_prepared` event before returning this result to a browser.
 */
export function buildGuestFollowUpHandoff(input: {
  guestDisplayName: string;
  messageKind: GuestFollowUpHandoffMessageKind;
  personalUrl: string;
  preparedAt: string;
  recipientWhatsAppPhoneE164: string;
  snapshot: PublishedInvitationSnapshotPayload;
}): GuestFollowUpHandoffResult {
  const messageText = buildGuestFollowUpHandoffMessage(input);

  return {
    messageKind: input.messageKind,
    messageText,
    personalUrl: input.personalUrl,
    preparedAt: input.preparedAt,
    whatsappComposeUrl: buildWhatsAppPersonalGuestHandoffUrl({
      message: messageText,
      personalGuestUrl: input.personalUrl,
      recipientWhatsAppPhoneE164: input.recipientWhatsAppPhoneE164,
    }),
  };
}
