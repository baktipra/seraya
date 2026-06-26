import type { GuestRsvpStatus } from '@/modules/guests/guest.types';
import type { InvitationTemplateKey } from '@/modules/invitation-templates/invitation-template.keys';
import type { PublishedInvitationSnapshotPayload } from '@/modules/publications/publication.types';

export type GuestPersonalLinkState = 'not_created' | 'active' | 'revoked';

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
