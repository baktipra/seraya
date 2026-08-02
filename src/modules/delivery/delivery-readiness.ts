import { deriveGuestLinkLifecycle } from '@/modules/guest-links/guest-link-lifecycle';

import type {
  DeliveryGuestRow,
  DeliveryReadinessDerivation,
  DeliveryReadinessFilter,
  DeliveryReadinessState,
  DeliveryReadinessSummary,
} from './delivery.types';

type DeliveryReadinessSubject = Pick<
  DeliveryGuestRow,
  | 'personalLinkLifecycleState'
  | 'personalLinkReaccessState'
  | 'personalLinkState'
  | 'whatsappAvailability'
>;

const readinessLabels: Record<DeliveryReadinessState, string> = {
  needs_link_update: 'Tautan perlu diperbarui',
  needs_whatsapp: 'Butuh nomor WhatsApp',
  no_personal_invitation: 'Belum punya Undangan Pribadi',
  ready_to_distribute: 'Siap dibagikan',
};

const followUpLabels: Record<DeliveryReadinessState, string> = {
  needs_link_update: 'Kelola tautan di Tamu',
  needs_whatsapp: 'Lengkapi nomor WhatsApp di Tamu',
  no_personal_invitation: 'Siapkan Undangan Pribadi',
  ready_to_distribute: 'Siap dibagikan',
};

function getLifecycleState(row: DeliveryReadinessSubject) {
  return (
    row.personalLinkLifecycleState ??
    deriveGuestLinkLifecycle({
      currentState: row.personalLinkState,
      reaccessState: row.personalLinkReaccessState,
    }).lifecycleState
  );
}

/**
 * Authoritative private delivery readiness derivation.
 *
 * An active link is never sufficient on its own. A row becomes ready only when
 * the canonical lifecycle says its active capability is recoverable and the
 * guest has a canonical WhatsApp number.
 */
export function deriveDeliveryReadiness(
  row: DeliveryReadinessSubject,
): DeliveryReadinessDerivation {
  const lifecycleState = getLifecycleState(row);
  const hasValidWhatsApp = row.whatsappAvailability === 'available';
  const hasRecoverableActivePersonalInvitation = lifecycleState === 'active_recoverable';

  const deliveryReadinessState: DeliveryReadinessState = hasRecoverableActivePersonalInvitation
    ? hasValidWhatsApp
      ? 'ready_to_distribute'
      : 'needs_whatsapp'
    : lifecycleState === 'not_created'
      ? 'no_personal_invitation'
      : 'needs_link_update';

  const isReadyToDistribute = deliveryReadinessState === 'ready_to_distribute';
  const canPrepareNewLink = deliveryReadinessState === 'no_personal_invitation';
  const requiresGuestManagerLifecycleAction = deliveryReadinessState === 'needs_link_update';

  return {
    canCopyLink: isReadyToDistribute,
    canOpenInvitation: isReadyToDistribute,
    canPrepareNewLink,
    canStartWhatsAppHandoff: isReadyToDistribute,
    deliveryFollowUpLabel: followUpLabels[deliveryReadinessState],
    deliveryReadinessLabel: readinessLabels[deliveryReadinessState],
    deliveryReadinessState,
    hasValidWhatsApp,
    isReadyToDistribute,
    requiresGuestManagerLifecycleAction,
  };
}

export function matchesDeliveryReadinessFilter(
  row: DeliveryReadinessSubject,
  filter: DeliveryReadinessFilter,
) {
  return filter === 'all' || deriveDeliveryReadiness(row).deliveryReadinessState === filter;
}

/** The summary uses the exact same state derivation used by row and filter UI. */
export function createDeliveryReadinessSummary(
  rows: readonly DeliveryGuestRow[],
): DeliveryReadinessSummary {
  return rows.reduce<DeliveryReadinessSummary>(
    (summary, row) => {
      const state = deriveDeliveryReadiness(row).deliveryReadinessState;
      return {
        activeGuestCount: summary.activeGuestCount + 1,
        needsLinkUpdateCount:
          summary.needsLinkUpdateCount + (state === 'needs_link_update' ? 1 : 0),
        needsWhatsAppCount: summary.needsWhatsAppCount + (state === 'needs_whatsapp' ? 1 : 0),
        noPersonalInvitationCount:
          summary.noPersonalInvitationCount + (state === 'no_personal_invitation' ? 1 : 0),
        readyToDistributeCount:
          summary.readyToDistributeCount + (state === 'ready_to_distribute' ? 1 : 0),
      };
    },
    {
      activeGuestCount: 0,
      needsLinkUpdateCount: 0,
      needsWhatsAppCount: 0,
      noPersonalInvitationCount: 0,
      readyToDistributeCount: 0,
    },
  );
}
