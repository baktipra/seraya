import type {
  GuestPersonalLinkReaccessState,
  GuestPersonalLinkState,
} from '@/modules/guest-links/guest-link.types';
import type { GuestRsvpStatus } from '@/modules/guests/guest.types';
import type { OwnedProject } from '@/modules/projects/project.repository';

export type DeliveryPersonalLinkState = GuestPersonalLinkState | 'expired';

/**
 * Mutually exclusive owner-facing delivery states. These states are derived
 * from existing guest/link projections only; they are never persisted.
 */
export type DeliveryReadinessState =
  | 'ready_to_distribute'
  | 'needs_whatsapp'
  | 'no_personal_invitation'
  | 'needs_link_update';

export type DeliveryReadinessFilter = 'all' | DeliveryReadinessState;

export type DeliveryWhatsAppAvailability = 'available' | 'missing';

/**
 * One pure, UI-safe readiness result shared by summary, filters, row actions,
 * bulk eligibility, and export. It deliberately contains no link material.
 */
export type DeliveryReadinessDerivation = {
  canCopyLink: boolean;
  canOpenInvitation: boolean;
  canPrepareNewLink: boolean;
  canStartWhatsAppHandoff: boolean;
  deliveryFollowUpLabel: string;
  deliveryReadinessLabel: string;
  deliveryReadinessState: DeliveryReadinessState;
  hasValidWhatsApp: boolean;
  isReadyToDistribute: boolean;
  requiresGuestManagerLifecycleAction: boolean;
};

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

/**
 * Every active guest belongs to exactly one state bucket. This is intentionally
 * independent of broader project readiness counts used by the overview.
 */
export type DeliveryReadinessSummary = {
  activeGuestCount: number;
  needsLinkUpdateCount: number;
  needsWhatsAppCount: number;
  noPersonalInvitationCount: number;
  readyToDistributeCount: number;
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
