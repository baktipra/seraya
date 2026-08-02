import { describe, expect, it } from 'vitest';

import {
  createDeliveryHandoffSummary,
  deriveDeliveryDistribution,
  matchesDeliveryDistributionFilter,
  projectInitialHandoffTruth,
} from '../delivery-distribution';
import type { DeliveryGuestRow } from '../delivery.types';

function row(overrides: Partial<DeliveryGuestRow> = {}): DeliveryGuestRow {
  return {
    contactRecordedAt: null,
    displayName: 'Tamu',
    groupLabel: null,
    initialHandoffPreparedAt: null,
    maskedWhatsAppNumber: '+62••••1234',
    personalLinkLifecycleState: 'active_recoverable',
    personalLinkReaccessState: 'recoverable',
    personalLinkState: 'active',
    rsvpStatus: 'pending',
    whatsappAvailability: 'available',
    ...overrides,
  };
}

describe('RC3 manual distribution truth', () => {
  it('projects latest initial handoff and owner contact records only', () => {
    const projected = projectInitialHandoffTruth(
      [{ ...row(), guestId: 'guest-a' }],
      [
        {
          eventType: 'handoff_prepared',
          guestId: 'guest-a',
          messageKind: 'initial_invitation',
          occurredAt: '2026-08-02T08:00:00.000Z',
        },
        {
          eventType: 'handoff_prepared',
          guestId: 'guest-a',
          messageKind: 'initial_invitation',
          occurredAt: '2026-08-02T09:00:00.000Z',
        },
        {
          eventType: 'manual_contact_recorded',
          guestId: 'guest-a',
          messageKind: 'initial_invitation',
          occurredAt: '2026-08-02T10:00:00.000Z',
        },
        {
          eventType: 'handoff_prepared',
          guestId: 'guest-a',
          messageKind: 'rsvp_reminder',
          occurredAt: '2026-08-02T11:00:00.000Z',
        },
      ],
    );

    expect(projected[0]).toMatchObject({
      contactRecordedAt: '2026-08-02T10:00:00.000Z',
      initialHandoffPreparedAt: '2026-08-02T09:00:00.000Z',
    });
    expect(projected[0]).not.toHaveProperty('metadata');
    expect(projected[0]).not.toHaveProperty('personalUrl');
  });

  it('separates ready, prepared, and owner-recorded contact truth', () => {
    expect(deriveDeliveryDistribution(row())).toMatchObject({
      distributionLabel: 'Siap dibagikan',
      distributionState: 'ready_for_handoff',
      isReadyForInitialHandoff: true,
      shareActionLabel: 'Siapkan pembagian',
    });

    expect(
      deriveDeliveryDistribution(
        row({ initialHandoffPreparedAt: '2026-08-02T09:15:00.000Z' }),
      ),
    ).toMatchObject({
      canRecordContact: true,
      distributionLabel: 'Pembagian disiapkan',
      distributionState: 'handoff_prepared',
      isAwaitingRsvp: true,
      isInitialHandoffPrepared: true,
    });

    expect(
      deriveDeliveryDistribution(
        row({
          contactRecordedAt: '2026-08-02T10:15:00.000Z',
          initialHandoffPreparedAt: '2026-08-02T09:15:00.000Z',
        }),
      ),
    ).toMatchObject({
      canRecordContact: false,
      distributionLabel: 'Ditandai sudah dihubungi',
      distributionState: 'contact_recorded',
      isAwaitingRsvp: true,
      isContactRecorded: true,
    });
  });

  it('keeps current repair needs authoritative over history', () => {
    expect(
      deriveDeliveryDistribution(
        row({
          contactRecordedAt: '2026-08-02T10:15:00.000Z',
          initialHandoffPreparedAt: '2026-08-02T09:15:00.000Z',
          whatsappAvailability: 'missing',
        }),
      ),
    ).toMatchObject({
      contactRecordedAt: null,
      distributionState: 'needs_whatsapp',
      initialHandoffPreparedAt: null,
      isContactRecorded: false,
    });
  });

  it('uses the same truth for summary and filters', () => {
    const rows = [
      row({ displayName: 'Ready' }),
      row({
        displayName: 'Prepared',
        initialHandoffPreparedAt: '2026-08-02T09:15:00.000Z',
      }),
      row({
        contactRecordedAt: '2026-08-02T10:15:00.000Z',
        displayName: 'Contacted',
        initialHandoffPreparedAt: '2026-08-02T09:15:00.000Z',
      }),
      row({ displayName: 'Missing WhatsApp', whatsappAvailability: 'missing' }),
    ];

    expect(createDeliveryHandoffSummary(rows)).toEqual({
      awaitingRsvpCount: 2,
      contactRecordedCount: 1,
      handoffPreparedCount: 1,
      readyForHandoffCount: 1,
    });
    expect(rows.filter((item) => matchesDeliveryDistributionFilter(item, 'contact_recorded'))).toHaveLength(1);
    expect(rows.filter((item) => matchesDeliveryDistributionFilter(item, 'awaiting_rsvp'))).toHaveLength(2);
    expect(rows.filter((item) => matchesDeliveryDistributionFilter(item, 'not_ready'))).toHaveLength(1);
    expect(rows.filter((item) => matchesDeliveryDistributionFilter(item, 'ready_for_handoff'))).toHaveLength(1);
  });
});
