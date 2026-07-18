export const guestFollowUpEventTypes = ['handoff_prepared', 'manual_contact_recorded'] as const;
export const guestFollowUpMessageKinds = [
  'initial_invitation',
  'rsvp_reminder',
  'event_reminder',
  'other',
] as const;
export const guestFollowUpChannels = ['whatsapp', 'other'] as const;

export type GuestFollowUpEventType = (typeof guestFollowUpEventTypes)[number];
export type GuestFollowUpMessageKind = (typeof guestFollowUpMessageKinds)[number];
export type GuestFollowUpChannel = (typeof guestFollowUpChannels)[number];

/**
 * Deliberately narrow metadata. Raw phone numbers, capability URLs, tokens, and
 * message bodies have no representation in this contract.
 */
export type GuestFollowUpMetadata = {
  noteCategory?: string;
  sourceSurface?: string;
  templateVersion?: string;
};

export type GuestFollowUpEvent = {
  channel: GuestFollowUpChannel;
  createdBy: string;
  eventType: GuestFollowUpEventType;
  guestId: string;
  id: string;
  messageKind: GuestFollowUpMessageKind;
  metadata: GuestFollowUpMetadata;
  occurredAt: string;
  projectId: string;
};

export type AppendGuestFollowUpEventInput = {
  channel: GuestFollowUpChannel;
  eventType: GuestFollowUpEventType;
  guestId: string;
  messageKind: GuestFollowUpMessageKind;
  metadata?: GuestFollowUpMetadata;
  occurredAt?: Date;
};

export type GuestFollowUpEventDatabaseRecord = {
  channel: string;
  created_by: string;
  event_type: string;
  guest_id: string;
  id: string;
  message_kind: string;
  metadata: unknown;
  occurred_at: string;
  project_id: string;
};
