import { describe, expect, it } from 'vitest';

import { deriveDeliveryReadiness } from '@/modules/delivery/delivery-readiness';
import {
  createLatestGuestLinkLifecycleMap,
  deriveGuestLinkLifecycle,
  getCompactGuestPersonalLinkState,
  getGuestLinkLifecycleCopy,
} from '@/modules/guest-links/guest-link-lifecycle';
import type {
  GuestLinkLifecycleState,
  GuestPersonalLinkCurrentState,
  GuestPersonalLinkReaccessState,
} from '@/modules/guest-links/guest-link.types';

describe('RC2 Slice A canonical guest-link lifecycle', () => {
  it.each<{
    currentState: GuestPersonalLinkCurrentState;
    expected: GuestLinkLifecycleState;
    reaccessState: GuestPersonalLinkReaccessState;
  }>([
    {
      currentState: 'not_created',
      expected: 'not_created',
      reaccessState: 'unavailable',
    },
    {
      currentState: 'active',
      expected: 'active_recoverable',
      reaccessState: 'recoverable',
    },
    {
      currentState: 'active',
      expected: 'active_legacy',
      reaccessState: 'legacy',
    },
    {
      currentState: 'revoked',
      expected: 'revoked',
      reaccessState: 'unavailable',
    },
    {
      currentState: 'expired',
      expected: 'expired',
      reaccessState: 'unavailable',
    },
  ])('derives $expected', ({ currentState, expected, reaccessState }) => {
    expect(deriveGuestLinkLifecycle({ currentState, reaccessState }).lifecycleState).toBe(
      expected,
    );
  });

  it('keeps create, re-access, replacement, and revocation eligibility explicit', () => {
    expect(
      deriveGuestLinkLifecycle({ currentState: 'not_created', reaccessState: 'unavailable' }),
    ).toMatchObject({
      canCreate: true,
      canReaccess: false,
      canReplace: false,
      canRevoke: false,
      requiresReplacementConfirmation: false,
    });
    expect(
      deriveGuestLinkLifecycle({ currentState: 'active', reaccessState: 'recoverable' }),
    ).toMatchObject({
      canCreate: false,
      canReaccess: true,
      canReplace: true,
      canRevoke: true,
      requiresReplacementConfirmation: true,
    });
    expect(
      deriveGuestLinkLifecycle({ currentState: 'active', reaccessState: 'legacy' }),
    ).toMatchObject({
      canCreate: false,
      canReaccess: false,
      canReplace: true,
      canRevoke: true,
      requiresReplacementConfirmation: true,
    });
  });

  it('selects the newest lifecycle record independently of input ordering', () => {
    const lifecycleByGuest = createLatestGuestLinkLifecycleMap([
      {
        created_at: '2026-07-01T00:00:00.000Z',
        guest_id: 'guest-1',
        hasRecoverableCapability: false,
        status: 'revoked',
      },
      {
        created_at: '2026-07-03T00:00:00.000Z',
        guest_id: 'guest-1',
        hasRecoverableCapability: true,
        status: 'active',
      },
      {
        created_at: '2026-07-02T00:00:00.000Z',
        guest_id: 'guest-2',
        hasRecoverableCapability: false,
        status: 'active',
      },
    ]);

    expect(lifecycleByGuest.get('guest-1')?.lifecycleState).toBe('active_recoverable');
    expect(lifecycleByGuest.get('guest-2')?.lifecycleState).toBe('active_legacy');
  });

  it('retains compatibility state without losing canonical legacy and expiry truth', () => {
    expect(getCompactGuestPersonalLinkState('active_legacy')).toBe('active');
    expect(getCompactGuestPersonalLinkState('expired')).toBe('revoked');
    expect(getGuestLinkLifecycleCopy('active_legacy').description).toContain(
      'Link lama masih aktif untuk tamu',
    );
  });

  it('lets canonical lifecycle override a contradictory compatibility projection', () => {
    const readiness = deriveDeliveryReadiness({
      personalLinkLifecycleState: 'active_legacy',
      personalLinkReaccessState: 'recoverable',
      personalLinkState: 'active',
      whatsappAvailability: 'available',
    });

    expect(readiness.deliveryReadinessState).toBe('needs_link_update');
    expect(readiness.requiresGuestManagerLifecycleAction).toBe(true);
    expect(readiness.canStartWhatsAppHandoff).toBe(false);
  });
});
