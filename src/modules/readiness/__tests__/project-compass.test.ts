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

const matureBase: WeddingReadinessV1 = {
  ...base,
  followUp: {
    awaitingRsvpCount: 0,
    noFollowUpRecordedCount: 0,
    rsvpRespondedCount: 0,
  },
};

describe('SRY-041 project compass next-step engine', () => {
  it('preserves pre-publish and republish priority', () => {
    expect(
      deriveProjectCompassNextStep(
        {
          ...base,
          invitation: {
            ...base.invitation,
            hasPublishedSnapshot: false,
            state: 'draft_incomplete',
          },
        },
        projectId,
      ).key,
    ).toBe('complete_invitation');
    expect(
      deriveProjectCompassNextStep(
        {
          ...base,
          invitation: {
            ...base.invitation,
            hasPublishedSnapshot: false,
            state: 'draft_ready_unactivated',
          },
        },
        projectId,
      ).key,
    ).toBe('activate_for_publish');
    expect(
      deriveProjectCompassNextStep(
        {
          ...base,
          invitation: {
            ...base.invitation,
            hasPublishedSnapshot: false,
            state: 'ready_to_publish',
          },
        },
        projectId,
      ).key,
    ).toBe('publish_invitation');
    expect(
      deriveProjectCompassNextStep(
        {
          ...base,
          invitation: {
            ...base.invitation,
            hasUnpublishedChanges: true,
            state: 'published_with_unpublished_changes',
          },
        },
        projectId,
      ).key,
    ).toBe('review_changes');
  });

  it('preserves the legacy ready-to-distribute fallback when follow-up projection is absent', () => {
    expect(
      deriveProjectCompassNextStep(
        { ...base, guests: { ...base.guests, readyToDistributeCount: 1 } },
        projectId,
      ).key,
    ).toBe('open_delivery_center');
  });

  it('uses the mature post-publish operational priority ladder', () => {
    expect(
      deriveProjectCompassNextStep(
        { ...matureBase, guests: { ...matureBase.guests, activeGuestCount: 0 } },
        projectId,
      ).key,
    ).toBe('add_guests');

    expect(
      deriveProjectCompassNextStep(
        { ...matureBase, guests: { ...matureBase.guests, needsLinkUpdateCount: 1 } },
        projectId,
      ).key,
    ).toBe('repair_guest_links');

    expect(
      deriveProjectCompassNextStep(
        { ...matureBase, guests: { ...matureBase.guests, needsWhatsAppCount: 1 } },
        projectId,
      ).key,
    ).toBe('complete_guest_whatsapp');

    expect(
      deriveProjectCompassNextStep(
        { ...matureBase, guests: { ...matureBase.guests, noPersonalInvitationCount: 1 } },
        projectId,
      ).key,
    ).toBe('prepare_personal_invitations');

    expect(
      deriveProjectCompassNextStep(
        {
          ...matureBase,
          followUp: { ...matureBase.followUp!, noFollowUpRecordedCount: 2 },
        },
        projectId,
      ).key,
    ).toBe('open_delivery_center');

    const followUp = deriveProjectCompassNextStep(
      {
        ...matureBase,
        followUp: { ...matureBase.followUp!, awaitingRsvpCount: 3 },
      },
      projectId,
    );
    expect(followUp.key).toBe('follow_up_pending_rsvp');
    expect(String(followUp.href)).toContain('delivery?view=follow-up&filter=awaiting_rsvp');

    expect(deriveProjectCompassNextStep(matureBase, projectId).key).toBe('view_guest_responses');
  });
});
