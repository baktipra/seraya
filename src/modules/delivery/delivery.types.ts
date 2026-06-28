import type {
  GuestPersonalLinkReaccessState,
  GuestPersonalLinkState,
} from '@/modules/guest-links/guest-link.types';
import type { GuestRsvpStatus } from '@/modules/guests/guest.types';
import type { OwnedProject } from '@/modules/projects/project.repository';

export type DeliveryPersonalLinkState = GuestPersonalLinkState | 'expired';

export type DeliveryReadinessFilter =
  | 'all'
  | 'attending'
  | 'declined'
  | 'legacy_link'
  | 'missing_whatsapp'
  | 'not_ready'
  | 'pending'
  | 'ready';

export type DeliveryWhatsAppAvailability = 'available' | 'missing';

/** Safe row shape for the owner browser. It intentionally has no token, URL, ciphertext, or key metadata. */
export type DeliveryGuestRow = {
  displayName: string;
  groupLabel: string | null;
  maskedWhatsAppNumber: string | null;
  personalLinkReaccessState: GuestPersonalLinkReaccessState;
  personalLinkState: DeliveryPersonalLinkState;
  rsvpStatus: GuestRsvpStatus;
  whatsappAvailability: DeliveryWhatsAppAvailability;
};

/** Server-only row shape used by the RSC page to bind a verified action target. */
export type DeliveryGuestActionRow = DeliveryGuestRow & {
  guestId: string;
};

export type DeliveryReadinessSummary = {
  activeGuestCount: number;
  activePersonalLinkCount: number;
  guestsWithoutActivePersonalLinkCount: number;
  whatsappAvailableCount: number;
  whatsappMissingCount: number;
};

/**
 * Aggregate-only batch outcome. It never identifies a guest or exposes a
 * capability. The counts make selection, eligibility, and runtime failures
 * observable without leaking link material or cross-project facts.
 */
export type DeliveryBatchPreparationResult = {
  createdCount: number;
  failedCount: number;
  failedEncryptionCount: number;
  failedUnexpectedCount: number;
  replacedExpiredLinkCount: number;
  replacedRevokedLinkCount: number;
  requestedGuestCount: number;
  skippedActiveLinkCount: number;
  skippedInactiveGuestCount: number;
  skippedInvalidProjectCount: number;
  whatsappMissingCreatedCount: number;
};

export type OwnedGuestDeliveryCenter = {
  isPublished: boolean;
  project: OwnedProject;
  rows: DeliveryGuestActionRow[];
  summary: DeliveryReadinessSummary;
};
