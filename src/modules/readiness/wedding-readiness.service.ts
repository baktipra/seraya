import 'server-only';

import { cache } from 'react';

import { getOwnedProjectContextForRequest } from '@/modules/auth/dashboard-request-context';
import { getGuestFollowUpCenterForVerifiedProject } from '@/modules/follow-up/follow-up.service';
import {
  invitationDraftContentSchema,
  type InvitationDraftContent,
} from '@/modules/invitations/invitation-draft.schema';
import type { InvitationDraft } from '@/modules/invitations/invitation-draft.types';
import { getActiveInvitationDraftForVerifiedProject } from '@/modules/invitations/invitation-draft.repository';
import { hasVerifiedActivationPaymentForVerifiedProject } from '@/modules/payments/payment.repository';
import { getCurrentPublishedInvitationForVerifiedProject } from '@/modules/publications/publication.repository';
import type { PublishedInvitationSnapshot } from '@/modules/publications/publication.types';
import { getProjectCoupleLabel } from '@/modules/projects/project.mapper';
import type { OwnedProject } from '@/modules/projects/project.repository';

import { deriveProjectCompassNextStep } from './project-compass';
import { getWeddingReadinessAggregateCountsForVerifiedProject } from './wedding-readiness.repository';
import type {
  InvitationReadinessState,
  InvitationReadinessV1,
  WeddingReadinessV1,
} from './wedding-readiness.types';

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(',')}]`;
  }

  const record = value as Record<string, unknown>;
  const entries = Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`);

  return `{${entries.join(',')}}`;
}

function normalizeContentForPublicationComparison(content: InvitationDraftContent) {
  return invitationDraftContentSchema.parse(content) as InvitationDraftContent;
}

/**
 * A review-ready draft means the repository's own normalized draft contract is
 * present and carries its required couple, template, and first schedule event.
 * This deliberately does not invent optional gallery, story, location, or gift
 * requirements.
 */
export function isSavedInvitationDraftReadyForReview(draft: InvitationDraft | null): boolean {
  if (!draft) {
    return false;
  }

  const parsed = invitationDraftContentSchema.safeParse(draft.content);

  if (!parsed.success) {
    return false;
  }

  const firstEvent = parsed.data.eventSchedule.events[0];

  return Boolean(
    parsed.data.templateKey &&
    parsed.data.couple.personOne.displayName &&
    parsed.data.couple.personTwo.displayName &&
    firstEvent?.title &&
    firstEvent.date &&
    firstEvent.startTime,
  );
}

/**
 * Compares only the saved, normalized invitation payload that feeds the public
 * render. No raw JSON ordering, browser dirty form state, project metadata, or
 * snapshot record metadata participates in this comparison.
 */
export function hasDeterministicSavedDraftChanges(input: {
  draft: InvitationDraft | null;
  publication: PublishedInvitationSnapshot | null;
}): boolean {
  if (!input.draft || !input.publication) {
    return false;
  }

  const draftContent = normalizeContentForPublicationComparison(input.draft.content);
  const publishedContent = normalizeContentForPublicationComparison(
    input.publication.snapshot.draft,
  );

  return stableSerialize(draftContent) !== stableSerialize(publishedContent);
}

function getInvitationState(input: {
  hasPublishedSnapshot: boolean;
  hasUnpublishedChanges: boolean;
  hasVerifiedActivation: boolean;
  isDraftReady: boolean;
}): InvitationReadinessState {
  if (input.hasPublishedSnapshot) {
    return input.hasUnpublishedChanges ? 'published_with_unpublished_changes' : 'published';
  }

  if (!input.isDraftReady) {
    return 'draft_incomplete';
  }

  return input.hasVerifiedActivation ? 'ready_to_publish' : 'draft_ready_unactivated';
}

type InvitationReadinessOptions = {
  draft?: InvitationDraft | null;
};

/**
 * Invitation-only readiness excludes every guest, RSVP, Guestbook, and
 * delivery aggregate. A caller that already loaded the active draft can pass
 * it explicitly so the same private draft is not queried twice in one screen.
 */
export async function getInvitationReadinessForVerifiedProject(
  project: OwnedProject,
  options: InvitationReadinessOptions = {},
): Promise<InvitationReadinessV1> {
  const draftPromise = Object.prototype.hasOwnProperty.call(options, 'draft')
    ? Promise.resolve(options.draft ?? null)
    : getActiveInvitationDraftForVerifiedProject(project);
  const [draft, publication, hasVerifiedActivation] = await Promise.all([
    draftPromise,
    getCurrentPublishedInvitationForVerifiedProject(project),
    hasVerifiedActivationPaymentForVerifiedProject(project),
  ]);
  const isDraftReady = isSavedInvitationDraftReadyForReview(draft);
  const hasUnpublishedChanges = hasDeterministicSavedDraftChanges({ draft, publication });
  const state = getInvitationState({
    hasPublishedSnapshot: Boolean(publication),
    hasUnpublishedChanges,
    hasVerifiedActivation,
    isDraftReady,
  });

  return {
    identity: {
      coupleLabel: getProjectCoupleLabel(project.person_one_name, project.person_two_name),
      templateKey: draft?.content.templateKey ?? publication?.snapshot.draft.templateKey ?? null,
    },
    invitation: {
      hasPublishedSnapshot: Boolean(publication),
      hasUnpublishedChanges,
      hasVerifiedActivation,
      publishedSlug: publication?.slug ?? null,
      state,
    },
  };
}

/**
 * Full project-compass readiness composes invitation truth, operational
 * aggregates, and the existing follow-up segmentation authority. The DTO stays
 * aggregate-only and never exposes raw follow-up events or guest capabilities.
 */
export async function getWeddingReadinessForVerifiedProject(
  project: OwnedProject,
): Promise<WeddingReadinessV1> {
  const [invitationReadiness, totals] = await Promise.all([
    getInvitationReadinessForVerifiedProject(project),
    getWeddingReadinessAggregateCountsForVerifiedProject(project),
  ]);
  const followUpSummary = invitationReadiness.invitation.hasPublishedSnapshot
    ? (await getGuestFollowUpCenterForVerifiedProject(project)).summary
    : null;
  const activePersonalLinkGuestCount = Math.min(
    totals.activeGuestCount,
    totals.activePersonalLinkGuestCount,
  );

  const readiness: WeddingReadinessV1 = {
    ...invitationReadiness,
    guests: {
      activeGuestCount: totals.activeGuestCount,
      activePersonalLinkGuestCount,
      guestsWithoutActivePersonalLinkCount: Math.max(
        0,
        totals.activeGuestCount - activePersonalLinkGuestCount,
      ),
      whatsappAvailableCount: Math.min(totals.activeGuestCount, totals.whatsappAvailableCount),
      whatsappUnavailableCount: Math.max(
        0,
        totals.activeGuestCount - Math.min(totals.activeGuestCount, totals.whatsappAvailableCount),
      ),
      readyToDistributeCount: totals.readyToDistributeCount,
      noPersonalInvitationCount: totals.noPersonalInvitationCount,
      needsLinkUpdateCount: totals.needsLinkUpdateCount,
      needsWhatsAppCount: totals.needsWhatsAppCount,
    },
    followUp: {
      awaitingRsvpCount: followUpSummary?.awaitingRsvpCount ?? 0,
      noFollowUpRecordedCount: followUpSummary?.noFollowUpRecordedCount ?? 0,
      rsvpRespondedCount: followUpSummary?.rsvpRespondedCount ?? 0,
    },
    primaryAction: { key: 'view_guest_responses' },
    responses: {
      activeGuestbookCount: totals.activeGuestbookCount,
      attendingCount: totals.attendingCount,
      confirmedAttendeeCount: totals.confirmedAttendeeCount,
      declinedCount: totals.declinedCount,
      hasActivePersonalLinks: activePersonalLinkGuestCount > 0,
      nonPendingRsvpCount: totals.nonPendingRsvpCount,
    },
  };
  const nextStep = deriveProjectCompassNextStep(readiness, project.id);

  return {
    ...readiness,
    primaryAction: {
      href: String(nextStep.href),
      key: nextStep.key,
    },
  };
}

/**
 * React.cache keeps the owner verification and aggregate composition request
 * local. It is intentionally not a cross-request cache for private readiness.
 */
export const getWeddingReadinessForRequest = cache(
  async (projectId: string): Promise<WeddingReadinessV1> => {
    const project = await getOwnedProjectContextForRequest(projectId);
    return getWeddingReadinessForVerifiedProject(project);
  },
);
