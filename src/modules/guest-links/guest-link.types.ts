import type { GuestRsvpStatus } from '@/modules/guests/guest.types';
import type { PublishedInvitationSnapshotPayload } from '@/modules/publications/publication.types';

export type GuestPersonalLinkState = 'not_created' | 'active' | 'revoked';

export type PersonalGuestInvitation = {
  guestDisplayName: string;
  rsvpStatus: GuestRsvpStatus;
  snapshot: PublishedInvitationSnapshotPayload;
  templateId: 'roselle';
};

export type GuestLinkStateRecord = {
  guest_id: string;
  status: 'active' | 'revoked' | 'expired';
};
