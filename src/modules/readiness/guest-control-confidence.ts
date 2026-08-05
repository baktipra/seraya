import type { WeddingReadinessV1 } from './wedding-readiness.types';

export type GuestControlConfidenceState =
  | 'no_guests'
  | 'managed'
  | 'needs_setup'
  | 'needs_attention';

export type GuestControlConfidenceSummary = {
  activeGuestCount: number;
  attentionCount: number;
  manageableLinkCount: number;
  missingLinkCount: number;
  needsUpdateCount: number;
  state: GuestControlConfidenceState;
};

type GuestControlAggregateInput = Pick<
  WeddingReadinessV1['guests'],
  | 'activeGuestCount'
  | 'activePersonalLinkGuestCount'
  | 'guestsWithoutActivePersonalLinkCount'
  | 'needsLinkUpdateCount'
  | 'needsWhatsAppCount'
  | 'noPersonalInvitationCount'
  | 'readyToDistributeCount'
>;

function toNonNegativeSafeInteger(value: number | undefined): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

/**
 * Derives the same four lifecycle buckets shown in Tamu from the existing
 * readiness aggregates. Production uses ready + WhatsApp-needed as the
 * recoverable-link bucket; no new query or second lifecycle authority exists.
 */
export function deriveGuestControlConfidence(
  input: GuestControlAggregateInput,
): GuestControlConfidenceSummary {
  const activeGuestCount = toNonNegativeSafeInteger(input.activeGuestCount);
  const missingRequested = toNonNegativeSafeInteger(
    input.noPersonalInvitationCount ?? input.guestsWithoutActivePersonalLinkCount,
  );
  const needsUpdateRequested = toNonNegativeSafeInteger(input.needsLinkUpdateCount);
  const hasCanonicalDeliveryBreakdown =
    typeof input.readyToDistributeCount === 'number' ||
    typeof input.needsWhatsAppCount === 'number';
  const manageableRequested = hasCanonicalDeliveryBreakdown
    ? toNonNegativeSafeInteger(input.readyToDistributeCount) +
      toNonNegativeSafeInteger(input.needsWhatsAppCount)
    : Math.max(0, activeGuestCount - missingRequested - needsUpdateRequested);

  const manageableLinkCount = Math.min(activeGuestCount, manageableRequested);
  const missingLinkCount = Math.min(
    Math.max(0, activeGuestCount - manageableLinkCount),
    missingRequested,
  );
  const remainingAfterKnown = Math.max(
    0,
    activeGuestCount - manageableLinkCount - missingLinkCount,
  );
  const explicitNeedsUpdateCount = Math.min(remainingAfterKnown, needsUpdateRequested);
  const unclassifiedAttentionCount = Math.max(0, remainingAfterKnown - explicitNeedsUpdateCount);
  const needsUpdateCount = explicitNeedsUpdateCount + unclassifiedAttentionCount;
  const attentionCount = missingLinkCount + needsUpdateCount;

  const state: GuestControlConfidenceState =
    activeGuestCount === 0
      ? 'no_guests'
      : manageableLinkCount === activeGuestCount
        ? 'managed'
        : missingLinkCount === activeGuestCount
          ? 'needs_setup'
          : 'needs_attention';

  return {
    activeGuestCount,
    attentionCount,
    manageableLinkCount,
    missingLinkCount,
    needsUpdateCount,
    state,
  };
}
