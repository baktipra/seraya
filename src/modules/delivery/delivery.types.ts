import type {
  GuestLinkLifecycleState,
  GuestPersonalLinkReaccessState,
  GuestPersonalLinkState,
} from '@/modules/guest-links/guest-link.types';
import type { GuestRsvpStatus } from '@/modules/guests/guest.types';
import type { OwnedProject } from '@/modules/projects/project.repository';

export type DeliveryPersonalLinkState = GuestPersonalLinkState | 'expired';

/** Technical prerequisites only; these are not delivery receipts. */
export type DeliveryReadinessState =
  | 'ready_to_distribute'
  | 'needs_whatsapp'
  | 'no_personal_invitation'
  | 'needs_link_update';

export type DeliveryReadinessFilter = 'all' | DeliveryReadinessState;

/**
 * Canonical manual-distribution truth. `contact_recorded` is an explicit owner
 * assertion and remains distinct from sent, delivered, opened, or read.
 */
export type DeliveryDistributionState =
  | 'ready_for_handoff'
  | 'handoff_prepared'
  | 'contact_recorded'
  | 'needs_whatsapp'
  | 'no_personal_invitation'
  | 'needs_link_update';

export type DeliveryDistributionFilter =
  | 'all'
  | DeliveryDistributionState
  | 'not_ready'
  | 'awaiting_rsvp';
export type DeliveryWhatsAppAvailability = 'available' | 'missing';

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

export type DeliveryDistributionDerivation = {
  canRecordContact: boolean;
  contactRecordedAt: string | null;
  distributionLabel: string;
  distributionState: DeliveryDistributionState;
  initialHandoffPreparedAt: string | null;
  isAwaitingRsvp: boolean;
  isContactRecorded: boolean;
  isInitialHandoffPrepared: boolean;
  isReadyForInitialHandoff: boolean;
  nextStepLabel: string;
  shareActionLabel: string;
};

/** Safe owner-browser row. No raw URL, token, ciphertext, or message body. */
export type DeliveryGuestRow = {
  contactRecordedAt?: string | null;
  displayName: string;
  groupLabel: string | null;
  initialHandoffPreparedAt?: string | null;
  maskedWhatsAppNumber: string | null;
  personalLinkLifecycleState?: GuestLinkLifecycleState;
  personalLinkReaccessState: GuestPersonalLinkReaccessState;
  personalLinkState: DeliveryPersonalLinkState;
  rsvpStatus: GuestRsvpStatus;
  whatsappAvailability: DeliveryWhatsAppAvailability;
};

export type DeliveryGuestActionRow = DeliveryGuestRow & {
  guestId: string;
};

export type DeliveryReadinessSummary = {
  activeGuestCount: number;
  needsLinkUpdateCount: number;
  needsWhatsAppCount: number;
  noPersonalInvitationCount: number;
  readyToDistributeCount: number;
};

export type DeliveryHandoffSummary = {
  awaitingRsvpCount: number;
  contactRecordedCount: number;
  handoffPreparedCount: number;
  readyForHandoffCount: number;
};

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

export type OwnedGuestDistributionCenter = OwnedGuestDeliveryCenter & {
  handoffSummary: DeliveryHandoffSummary;
};
