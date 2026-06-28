import { describe, expect, it } from 'vitest';

import { deriveProjectCompassNextStep } from '@/modules/readiness/project-compass';
import type { WeddingReadinessV1 } from '@/modules/readiness';

const projectId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const base: WeddingReadinessV1 = {
  identity: { coupleLabel: 'Raka & Nadia', templateKey: 'roselle' },
  invitation: {
    hasPublishedSnapshot: true,
    hasUnpublishedChanges: false,
    hasVerifiedActivation: true,
    publishedSlug: 'raka-nadia',
    state: 'published',
  },
  guests: {
    activeGuestCount: 1,
    activePersonalLinkGuestCount: 1,
    guestsWithoutActivePersonalLinkCount: 0,
    whatsappAvailableCount: 1,
    whatsappUnavailableCount: 0,
    readyToDistributeCount: 0,
    noPersonalInvitationCount: 0,
    needsLinkUpdateCount: 0,
    needsWhatsAppCount: 0,
  },
  primaryAction: { key: 'view_guest_responses' },
  responses: {
    activeGuestbookCount: 0,
    attendingCount: 0,
    confirmedAttendeeCount: 0,
    declinedCount: 0,
    hasActivePersonalLinks: true,
    nonPendingRsvpCount: 0,
  },
};

describe('SRY-041 project compass next-step engine', () => {
  it('returns exactly one CTA and preserves the agreed priority order', () => {
    expect(
      deriveProjectCompassNextStep(
        { ...base, invitation: { ...base.invitation, hasPublishedSnapshot: false } },
        projectId,
      ).key,
    ).toBe('complete_invitation');
    expect(
      deriveProjectCompassNextStep(
        { ...base, invitation: { ...base.invitation, hasUnpublishedChanges: true } },
        projectId,
      ).key,
    ).toBe('review_changes');
    expect(
      deriveProjectCompassNextStep(
        { ...base, guests: { ...base.guests, activeGuestCount: 0 } },
        projectId,
      ).key,
    ).toBe('add_guests');
    expect(
      deriveProjectCompassNextStep(
        { ...base, guests: { ...base.guests, noPersonalInvitationCount: 1 } },
        projectId,
      ).key,
    ).toBe('prepare_personal_invitations');
    expect(
      deriveProjectCompassNextStep(
        { ...base, guests: { ...base.guests, readyToDistributeCount: 1 } },
        projectId,
      ).key,
    ).toBe('open_delivery_center');
    expect(deriveProjectCompassNextStep(base, projectId).key).toBe('view_guest_responses');
  });
});
