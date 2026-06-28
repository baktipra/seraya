import type { InvitationTemplateKey } from '@/modules/invitation-templates/invitation-template.keys';

export type InvitationReadinessState =
  | 'draft_incomplete'
  | 'draft_ready_unactivated'
  | 'ready_to_publish'
  | 'published'
  | 'published_with_unpublished_changes';

export type WeddingReadinessPrimaryActionKey =
  | 'complete_invitation'
  | 'preview_invitation'
  | 'activate_for_publish'
  | 'publish_invitation'
  | 'review_changes'
  | 'add_guests'
  | 'prepare_personal_invitations'
  | 'open_delivery_center'
  | 'view_guest_responses';

/**
 * Owner-safe, private project readiness projection. It intentionally contains
 * only aggregate facts and never capability material, guest rows, payment
 * transaction detail, or snapshot JSON.
 */
export type WeddingReadinessV1 = {
  identity: {
    coupleLabel: string;
    templateKey: InvitationTemplateKey | null;
  };
  invitation: {
    hasPublishedSnapshot: boolean;
    hasUnpublishedChanges: boolean;
    hasVerifiedActivation: boolean;
    /** Owner-safe current public path material; never includes invitation content or guest data. */
    publishedSlug: string | null;
    state: InvitationReadinessState;
  };
  guests: {
    activeGuestCount: number;
    activePersonalLinkGuestCount: number;
    guestsWithoutActivePersonalLinkCount: number;
    whatsappAvailableCount: number;
    whatsappUnavailableCount: number;
    /** SRY-039A authoritative delivery readiness counts. */
    readyToDistributeCount?: number;
    noPersonalInvitationCount?: number;
    needsLinkUpdateCount?: number;
    needsWhatsAppCount?: number;
  };
  primaryAction: {
    /** A route is present only when the primary action is a navigation. */
    href?: string;
    key: WeddingReadinessPrimaryActionKey;
  };
  responses: {
    activeGuestbookCount: number;
    attendingCount: number;
    confirmedAttendeeCount: number;
    declinedCount: number;
    hasActivePersonalLinks: boolean;
    nonPendingRsvpCount: number;
  };
};

export type WeddingReadinessAggregateCounts = {
  activeGuestCount: number;
  activeGuestbookCount: number;
  activePersonalLinkGuestCount: number;
  attendingCount: number;
  confirmedAttendeeCount: number;
  declinedCount: number;
  nonPendingRsvpCount: number;
  whatsappAvailableCount: number;
  readyToDistributeCount: number;
  noPersonalInvitationCount: number;
  needsLinkUpdateCount: number;
  needsWhatsAppCount: number;
};
