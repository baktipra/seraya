import { describe, expect, it } from 'vitest';

import type { DeliveryGuestActionRow } from '@/modules/delivery/delivery.types';

import {
  createFollowUpGuestRows,
  createGuestFollowUpSummary,
  deriveGuestFollowUpSegment,
  matchesGuestFollowUpSegmentFilter,
} from '../follow-up-segmentation';
import type { GuestFollowUpEvent } from '../follow-up.types';

function row(overrides: Partial<DeliveryGuestActionRow> = {}): DeliveryGuestActionRow {
  return {
    displayName: 'Keluarga Budi',
    groupLabel: 'Keluarga',
    guestId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    maskedWhatsAppNumber: '+62••••7890',
    personalLinkReaccessState: 'recoverable',
    personalLinkState: 'active',
    rsvpStatus: 'pending',
    whatsappAvailability: 'available',
    ...overrides,
  };
}

function event(overrides: Partial<GuestFollowUpEvent> = {}): GuestFollowUpEvent {
  return {
    channel: 'whatsapp',
    createdBy: '11111111-1111-1111-1111-111111111111',
    eventType: 'handoff_prepared',
    guestId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    messageKind: 'initial_invitation',
    metadata: {},
    occurredAt: '2027-01-03T00:00:00.000Z',
    projectId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    ...overrides,
  };
}

describe('Guest Follow-up Slice B segmentation read model', () => {
  it.each([
    [
      'needs link update before considering an attending RSVP',
      row({
        personalLinkReaccessState: 'legacy',
        rsvpStatus: 'attending',
      }),
      'needs_link_update',
    ],
    [
      'needs WhatsApp before considering a declined RSVP',
      row({
        maskedWhatsAppNumber: null,
        rsvpStatus: 'declined',
        whatsappAvailability: 'missing',
      }),
      'needs_whatsapp',
    ],
    [
      'needs a personal invitation before considering RSVP activity',
      row({
        personalLinkReaccessState: 'unavailable',
        personalLinkState: 'not_created',
        rsvpStatus: 'attending',
      }),
      'no_personal_invitation',
    ],
    ['marks an attending response as responded', row({ rsvpStatus: 'attending' }), 'rsvp_responded'],
    ['marks a declined response as responded', row({ rsvpStatus: 'declined' }), 'rsvp_responded'],
  ])('%s', (_name, input, expected) => {
    expect(
      deriveGuestFollowUpSegment({
        activity: { followUpCount: 0, lastFollowUpAt: null, lastMessageKind: null },
        row: input,
      }),
    ).toBe(expected);
  });

  it('distinguishes pending guests with no recorded activity from pending guests awaiting RSVP', () => {
    const input = row();

    expect(
      deriveGuestFollowUpSegment({
        activity: { followUpCount: 0, lastFollowUpAt: null, lastMessageKind: null },
        row: input,
      }),
    ).toBe('no_follow_up_recorded');
    expect(
      deriveGuestFollowUpSegment({
        activity: {
          followUpCount: 1,
          lastFollowUpAt: '2027-01-03T00:00:00.000Z',
          lastMessageKind: 'initial_invitation',
        },
        row: input,
      }),
    ).toBe('awaiting_rsvp');
  });

  it('projects only the latest safe activity fields and derives RSVP-aware eligibility', () => {
    const rows = createFollowUpGuestRows(
      [
        row(),
        row({
          displayName: 'Rani',
          guestId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
          rsvpStatus: 'attending',
        }),
        row({
          displayName: 'Dimas',
          guestId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
          rsvpStatus: 'declined',
        }),
      ],
      [
        event({ id: '11111111-1111-4111-8111-111111111111' }),
        event({
          id: '22222222-2222-4222-8222-222222222222',
          messageKind: 'rsvp_reminder',
          occurredAt: '2027-01-05T00:00:00.000Z',
        }),
        event({
          guestId: '99999999-9999-4999-8999-999999999999',
          id: '33333333-3333-4333-8333-333333333333',
        }),
      ],
    );

    expect(rows[0]).toMatchObject({
      eligibility: {
        canPrepareEventReminder: false,
        canPrepareInitialInvitation: false,
        canPrepareRsvpReminder: true,
      },
      followUpCount: 2,
      followUpSegment: 'awaiting_rsvp',
      lastFollowUpAt: '2027-01-05T00:00:00.000Z',
      lastMessageKind: 'rsvp_reminder',
    });
    expect(rows[1]).toMatchObject({
      eligibility: {
        canPrepareEventReminder: true,
        canPrepareInitialInvitation: false,
        canPrepareRsvpReminder: false,
      },
      followUpSegment: 'rsvp_responded',
    });
    expect(rows[2]).toMatchObject({
      eligibility: {
        canPrepareEventReminder: false,
        canPrepareInitialInvitation: false,
        canPrepareRsvpReminder: false,
      },
      followUpSegment: 'rsvp_responded',
    });

    for (const item of rows) {
      expect(item).not.toHaveProperty('metadata');
      expect(item).not.toHaveProperty('createdBy');
      expect(item).not.toHaveProperty('personalUrl');
      expect(item).not.toHaveProperty('token');
      expect(item).not.toHaveProperty('whatsapp_phone_e164');
    }
  });

  it('uses the exact row segment truth for summary and filters', () => {
    const rows = [
      { followUpSegment: 'needs_link_update' as const },
      { followUpSegment: 'needs_whatsapp' as const },
      { followUpSegment: 'no_personal_invitation' as const },
      { followUpSegment: 'rsvp_responded' as const },
      { followUpSegment: 'no_follow_up_recorded' as const },
      { followUpSegment: 'awaiting_rsvp' as const },
    ];

    expect(createGuestFollowUpSummary(rows)).toEqual({
      activeGuestCount: 6,
      awaitingRsvpCount: 1,
      needsDataRepairCount: 2,
      needsLinkUpdateCount: 1,
      needsPreparationCount: 1,
      needsWhatsAppCount: 1,
      noFollowUpRecordedCount: 1,
      noPersonalInvitationCount: 1,
      rsvpRespondedCount: 1,
    });

    for (const item of rows) {
      expect(matchesGuestFollowUpSegmentFilter(item, item.followUpSegment)).toBe(true);
    }
    expect(rows.filter((item) => matchesGuestFollowUpSegmentFilter(item, 'all'))).toHaveLength(6);
  });

  it('makes initial invitation eligible only for a ready pending guest with no activity', () => {
    const [item] = createFollowUpGuestRows([row()], []);

    expect(item).toMatchObject({
      eligibility: {
        canPrepareEventReminder: false,
        canPrepareInitialInvitation: true,
        canPrepareRsvpReminder: false,
      },
      followUpSegment: 'no_follow_up_recorded',
    });
  });
});
