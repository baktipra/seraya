import type { GuestPersonalLinkState } from '@/modules/guest-links/guest-link.types';
import type { OwnedProject } from '@/modules/projects/project.repository';

export type DeliveryPersonalLinkState = GuestPersonalLinkState | 'expired';

export type DeliveryReadinessFilter = 'all' | 'missing_whatsapp' | 'not_ready' | 'ready';

export type DeliveryWhatsAppAvailability = 'available' | 'missing';

/**
 * Owner-private row presentation. guestId is a server-only action target and
 * must never be rendered as visible UI or returned by a public route.
 */
/** Safe row shape for rendering in the owner browser. It intentionally has no guest ID. */
export type DeliveryGuestRow = {
  displayName: string;
  groupLabel: string | null;
  maskedWhatsAppNumber: string | null;
  personalLinkState: DeliveryPersonalLinkState;
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
