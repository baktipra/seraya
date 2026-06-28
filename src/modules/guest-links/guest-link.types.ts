import type { GuestRsvpStatus } from '@/modules/guests/guest.types';
import type { InvitationTemplateKey } from '@/modules/invitation-templates/invitation-template.keys';
import type { PublishedInvitationSnapshotPayload } from '@/modules/publications/publication.types';

export type GuestPersonalLinkState = 'not_created' | 'active' | 'revoked';

/** Delivery-only current/latest state; Guest Manager retains its existing compact state projection. */
export type GuestPersonalLinkCurrentState = GuestPersonalLinkState | 'expired';

/** Owner-facing state only. It deliberately says nothing about token material. */
export type GuestPersonalLinkReaccessState = 'legacy' | 'recoverable' | 'unavailable';

/** Narrow personal capability payload. It contains only the resolved guest's live RSVP fields. */
export type PersonalGuestInvitation = {
  guestDisplayName: string;
  partySize: number;
  rsvpAttendeeCount: number | null;
  rsvpStatus: GuestRsvpStatus;
  snapshot: PublishedInvitationSnapshotPayload;
  templateId: InvitationTemplateKey;
};

export type GuestLinkStateRecord = {
  guest_id: string;
  status: 'active' | 'revoked' | 'expired';
};

/** Narrow status-only row used to derive the latest delivery state without link material. */
export type LatestGuestLinkStateRecord = GuestLinkStateRecord & {
  created_at: string;
  hasRecoverableCapability: boolean;
};

/** Server-only material fetched only after the caller has verified owner + project + guest scope. */
export type ActiveRecoverableGuestLinkRecord = {
  guest_id: string;
  token_ciphertext: string | null;
  token_hash: string;
  token_key_version: number | null;
};
