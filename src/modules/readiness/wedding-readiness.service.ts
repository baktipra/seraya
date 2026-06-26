import 'server-only';

import { cache } from 'react';

import { getOwnedProjectContextForRequest } from '@/modules/auth/dashboard-request-context';
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

import { getWeddingReadinessAggregateCountsForVerifiedProject } from './wedding-readiness.repository';
import type {
  InvitationReadinessState,
  WeddingReadinessAggregateCounts,
  WeddingReadinessPrimaryActionKey,
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

function getPrimaryAction(input: {
  invitationState: InvitationReadinessState;
  projectId: string;
  totals: WeddingReadinessAggregateCounts;
}): WeddingReadinessV1['primaryAction'] {
  const action = (key: WeddingReadinessPrimaryActionKey, path: string) => ({
    href: `/dashboard/${input.projectId}${path}`,
    key,
  });

  if (input.invitationState === 'draft_incomplete') {
    return action('complete_invitation', '/invitation');
  }

  if (input.invitationState === 'draft_ready_unactivated') {
    return action('preview_invitation', '/preview');
  }

  if (input.invitationState === 'ready_to_publish') {
    return action('publish_invitation', '/billing');
  }

  if (input.invitationState === 'published_with_unpublished_changes') {
    return action('review_changes', '/preview');
  }

  if (input.totals.activeGuestCount === 0) {
    return action('add_guests', '/guests');
  }

  if (input.totals.activePersonalLinkGuestCount < input.totals.activeGuestCount) {
    return action('prepare_personal_invitations', '/delivery');
  }

  if (input.totals.nonPendingRsvpCount === 0 && input.totals.activeGuestbookCount === 0) {
    return action('open_delivery_center', '/delivery');
  }

  return action('view_guest_responses', '/rsvp');
}

/**
 * Server-only composition after ownership is already verified. The DTO remains
 * aggregate-only and excludes all source payloads used to derive it.
 */
export async function getWeddingReadinessForVerifiedProject(
  project: OwnedProject,
): Promise<WeddingReadinessV1> {
  const [draft, publication, hasVerifiedActivation, totals] = await Promise.all([
    getActiveInvitationDraftForVerifiedProject(project),
    getCurrentPublishedInvitationForVerifiedProject(project),
    hasVerifiedActivationPaymentForVerifiedProject(project),
    getWeddingReadinessAggregateCountsForVerifiedProject(project),
  ]);
  const isDraftReady = isSavedInvitationDraftReadyForReview(draft);
  const hasUnpublishedChanges = hasDeterministicSavedDraftChanges({ draft, publication });
  const state = getInvitationState({
    hasPublishedSnapshot: Boolean(publication),
    hasUnpublishedChanges,
    hasVerifiedActivation,
    isDraftReady,
  });
  const activePersonalLinkGuestCount = Math.min(
    totals.activeGuestCount,
    totals.activePersonalLinkGuestCount,
  );

  return {
    identity: {
      coupleLabel: getProjectCoupleLabel(project.person_one_name, project.person_two_name),
      templateKey: draft?.content.templateKey ?? publication?.snapshot.draft.templateKey ?? null,
    },
    invitation: {
      hasPublishedSnapshot: Boolean(publication),
      hasUnpublishedChanges,
      hasVerifiedActivation,
      state,
    },
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
    },
    primaryAction: getPrimaryAction({ invitationState: state, projectId: project.id, totals }),
    responses: {
      activeGuestbookCount: totals.activeGuestbookCount,
      attendingCount: totals.attendingCount,
      confirmedAttendeeCount: totals.confirmedAttendeeCount,
      declinedCount: totals.declinedCount,
      hasActivePersonalLinks: activePersonalLinkGuestCount > 0,
      nonPendingRsvpCount: totals.nonPendingRsvpCount,
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
