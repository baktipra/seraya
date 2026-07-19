import type {
  DeliveryPersonalLinkState,
  DeliveryWhatsAppAvailability,
} from '@/modules/delivery/delivery.types';
import type { GuestPersonalLinkReaccessState } from '@/modules/guest-links/guest-link.types';
import type { GuestRsvpStatus } from '@/modules/guests/guest.types';
import type { OwnedProject } from '@/modules/projects/project.repository';

export const guestFollowUpEventTypes = ['handoff_prepared', 'manual_contact_recorded'] as const;
export const guestFollowUpMessageKinds = [
  'initial_invitation',
  'rsvp_reminder',
  'event_reminder',
  'other',
] as const;
export const guestFollowUpHandoffMessageKinds = [
  'initial_invitation',
  'rsvp_reminder',
  'event_reminder',
] as const;
export const guestFollowUpChannels = ['whatsapp', 'other'] as const;
export const guestFollowUpSegments = [
  'needs_link_update',
  'needs_whatsapp',
  'no_personal_invitation',
  'rsvp_responded',
  'no_follow_up_recorded',
  'awaiting_rsvp',
] as const;

export type GuestFollowUpEventType = (typeof guestFollowUpEventTypes)[number];
export type GuestFollowUpMessageKind = (typeof guestFollowUpMessageKinds)[number];
export type GuestFollowUpHandoffMessageKind = (typeof guestFollowUpHandoffMessageKinds)[number];
export type GuestFollowUpChannel = (typeof guestFollowUpChannels)[number];
export type GuestFollowUpSegment = (typeof guestFollowUpSegments)[number];
export type GuestFollowUpSegmentFilter = 'all' | GuestFollowUpSegment;

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

export type GuestFollowUpEligibility = {
  canPrepareEventReminder: boolean;
  canPrepareInitialInvitation: boolean;
  canPrepareRsvpReminder: boolean;
};

/**
 * Temporary server-action result. It exists only long enough for the owner
 * browser to open WhatsApp or copy a fallback; none of these fields are stored.
 */
export type GuestFollowUpHandoffResult = {
  messageKind: GuestFollowUpHandoffMessageKind;
  messageText: string;
  personalUrl: string;
  preparedAt: string;
  whatsappComposeUrl: string;
};

/**
 * Owner-browser read model. It deliberately repeats only the privacy-safe
 * delivery projection and never includes a raw phone, capability, or event
 * metadata payload.
 */
export type FollowUpGuestRow = {
  displayName: string;
  eligibility: GuestFollowUpEligibility;
  followUpCount: number;
  followUpSegment: GuestFollowUpSegment;
  groupLabel: string | null;
  guestId: string;
  lastFollowUpAt: string | null;
  lastMessageKind: GuestFollowUpMessageKind | null;
  maskedWhatsAppNumber: string | null;
  personalLinkReaccessState: GuestPersonalLinkReaccessState;
  personalLinkState: DeliveryPersonalLinkState;
  rsvpStatus: GuestRsvpStatus;
  whatsappAvailability: DeliveryWhatsAppAvailability;
};

/** Every active guest belongs to exactly one segment count. */
export type GuestFollowUpSummary = {
  activeGuestCount: number;
  awaitingRsvpCount: number;
  needsDataRepairCount: number;
  needsLinkUpdateCount: number;
  needsPreparationCount: number;
  needsWhatsAppCount: number;
  noFollowUpRecordedCount: number;
  noPersonalInvitationCount: number;
  rsvpRespondedCount: number;
};

export type OwnedGuestFollowUpCenter = {
  isPublished: boolean;
  project: OwnedProject;
  rows: FollowUpGuestRow[];
  summary: GuestFollowUpSummary;
};
