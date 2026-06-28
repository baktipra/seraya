import type {
  GuestPersonalLinkReaccessState,
  GuestPersonalLinkState,
} from '@/modules/guest-links/guest-link.types';
import type { GuestRsvpStatus } from '@/modules/guests/guest.types';
import type { OwnedProject } from '@/modules/projects/project.repository';

export type DeliveryPersonalLinkState = GuestPersonalLinkState | 'expired';

export type DeliveryReadinessFilter = 'all' | 'missing_whatsapp' | 'not_ready' | 'ready';

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

/** No tokens, URLs, IDs, or per-guest details may leave the batch authority. */
export type DeliveryBatchPreparationResult = {
  createdCount: number;
  failedCount: number;
  skippedActiveLinkCount: number;
  whatsappMissingCreatedCount: number;
};

export type OwnedGuestDeliveryCenter = {
  isPublished: boolean;
  project: OwnedProject;
  rows: DeliveryGuestActionRow[];
  summary: DeliveryReadinessSummary;
};
