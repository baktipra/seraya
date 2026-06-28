import { describe, expect, it } from 'vitest';

import {
  createDeliveryReadinessSummary,
  deriveDeliveryReadiness,
  matchesDeliveryReadinessFilter,
} from '../delivery-readiness';
import type { DeliveryGuestRow } from '../delivery.types';

function row(overrides: Partial<DeliveryGuestRow> = {}): DeliveryGuestRow {
  return {
    displayName: 'Tamu',
    groupLabel: null,
    maskedWhatsAppNumber: null,
    personalLinkReaccessState: 'unavailable',
    personalLinkState: 'not_created',
    rsvpStatus: 'pending',
    whatsappAvailability: 'missing',
    ...overrides,
  };
}

describe('SRY-039A delivery readiness derivation', () => {
  it('derives ready only for an active recoverable invitation with a valid WhatsApp number', () => {
    const readiness = deriveDeliveryReadiness(
      row({
        personalLinkReaccessState: 'recoverable',
        personalLinkState: 'active',
        whatsappAvailability: 'available',
      }),
    );

    expect(readiness).toMatchObject({
      canCopyLink: true,
      canOpenInvitation: true,
      canPrepareNewLink: false,
      canStartWhatsAppHandoff: true,
      deliveryReadinessLabel: 'Siap dibagikan',
      deliveryReadinessState: 'ready_to_distribute',
      hasValidWhatsApp: true,
      isReadyToDistribute: true,
      requiresGuestManagerLifecycleAction: false,
    });
  });

  it('derives the no-WhatsApp handoff from an otherwise recoverable active invitation', () => {
    const readiness = deriveDeliveryReadiness(
      row({
        personalLinkReaccessState: 'recoverable',
        personalLinkState: 'active',
      }),
    );

    expect(readiness).toMatchObject({
      canCopyLink: false,
      canOpenInvitation: false,
      canPrepareNewLink: false,
      canStartWhatsAppHandoff: false,
      deliveryFollowUpLabel: 'Lengkapi nomor WhatsApp di Tamu',
      deliveryReadinessLabel: 'Butuh nomor WhatsApp',
      deliveryReadinessState: 'needs_whatsapp',
      hasValidWhatsApp: false,
      isReadyToDistribute: false,
    });
  });

  it.each([
    ['active legacy', row({ personalLinkReaccessState: 'legacy', personalLinkState: 'active' })],
    ['revoked', row({ personalLinkState: 'revoked' })],
    ['expired', row({ personalLinkState: 'expired' })],
  ])('routes %s invitation lifecycle through Tamu', (_name, input) => {
    const readiness = deriveDeliveryReadiness(input);

    expect(readiness).toMatchObject({
      canCopyLink: false,
      canOpenInvitation: false,
      canPrepareNewLink: false,
      canStartWhatsAppHandoff: false,
      deliveryFollowUpLabel: 'Kelola tautan di Tamu',
      deliveryReadinessLabel: 'Tautan perlu diperbarui',
      deliveryReadinessState: 'needs_link_update',
      requiresGuestManagerLifecycleAction: true,
    });
  });

  it('allows new preparation only for the no-link eligible state', () => {
    const readiness = deriveDeliveryReadiness(row());

    expect(readiness).toMatchObject({
      canCopyLink: false,
      canOpenInvitation: false,
      canPrepareNewLink: true,
      canStartWhatsAppHandoff: false,
      deliveryFollowUpLabel: 'Siapkan Undangan Pribadi',
      deliveryReadinessLabel: 'Belum punya Undangan Pribadi',
      deliveryReadinessState: 'no_personal_invitation',
    });
  });

  it('uses the same derivation for mutually exclusive summary and filters', () => {
    const rows = [
      row({
        displayName: 'Ready',
        personalLinkReaccessState: 'recoverable',
        personalLinkState: 'active',
        whatsappAvailability: 'available',
      }),
      row({
        displayName: 'No WhatsApp',
        personalLinkReaccessState: 'recoverable',
        personalLinkState: 'active',
      }),
      row({
        displayName: 'Legacy',
        personalLinkReaccessState: 'legacy',
        personalLinkState: 'active',
      }),
      row({ displayName: 'Revoked', personalLinkState: 'revoked' }),
      row({ displayName: 'Expired', personalLinkState: 'expired' }),
      row({ displayName: 'No Link' }),
    ];

    expect(createDeliveryReadinessSummary(rows)).toEqual({
      activeGuestCount: 6,
      needsLinkUpdateCount: 3,
      needsWhatsAppCount: 1,
      noPersonalInvitationCount: 1,
      readyToDistributeCount: 1,
    });
    expect(
      rows.filter((item) => matchesDeliveryReadinessFilter(item, 'ready_to_distribute')),
    ).toHaveLength(1);
    expect(
      rows.filter((item) => matchesDeliveryReadinessFilter(item, 'needs_whatsapp')),
    ).toHaveLength(1);
    expect(
      rows.filter((item) => matchesDeliveryReadinessFilter(item, 'needs_link_update')),
    ).toHaveLength(3);
    expect(
      rows.filter((item) => matchesDeliveryReadinessFilter(item, 'no_personal_invitation')),
    ).toHaveLength(1);
  });
});
