import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultInvitationDraftContent } from '@/modules/invitations/invitation-draft.defaults';

const {
  getAggregateMock,
  getDraftMock,
  getPublishedMock,
  hasVerifiedActivationMock,
  ownedProjectContextMock,
} = vi.hoisted(() => ({
  getAggregateMock: vi.fn(),
  getDraftMock: vi.fn(),
  getPublishedMock: vi.fn(),
  hasVerifiedActivationMock: vi.fn(),
  ownedProjectContextMock: vi.fn(),
}));

vi.mock('@/modules/auth/dashboard-request-context', () => ({
  getOwnedProjectContextForRequest: ownedProjectContextMock,
}));
vi.mock('@/modules/invitations/invitation-draft.repository', () => ({
  getActiveInvitationDraftForVerifiedProject: getDraftMock,
}));
vi.mock('@/modules/payments/payment.repository', () => ({
  hasVerifiedActivationPaymentForVerifiedProject: hasVerifiedActivationMock,
}));
vi.mock('@/modules/publications/publication.repository', () => ({
  getCurrentPublishedInvitationForVerifiedProject: getPublishedMock,
}));
vi.mock('@/modules/readiness/wedding-readiness.repository', () => ({
  getWeddingReadinessAggregateCountsForVerifiedProject: getAggregateMock,
}));

import {
  getWeddingReadinessForVerifiedProject,
  hasDeterministicSavedDraftChanges,
} from '@/modules/readiness/wedding-readiness.service';

const project = {
  account_id: '11111111-1111-1111-1111-111111111111',
  default_timezone: 'Asia/Jakarta',
  deleted_at: null,
  event_city: 'Jakarta',
  event_date_primary: '2027-08-17',
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  person_one_name: 'Raka',
  person_two_name: 'Nadia',
  slug: 'raka-nadia',
  status: 'draft',
};

const defaultCounts = {
  activeGuestCount: 0,
  activeGuestbookCount: 0,
  activePersonalLinkGuestCount: 0,
  attendingCount: 0,
  confirmedAttendeeCount: 0,
  declinedCount: 0,
  nonPendingRsvpCount: 0,
  whatsappAvailableCount: 0,
};

function createDraft() {
  return {
    content: createDefaultInvitationDraftContent(project),
    created_at: '2026-06-20T00:00:00.000Z',
    deleted_at: null,
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    project_id: project.id,
    schema_version: 1 as const,
    updated_at: '2026-06-20T00:00:00.000Z',
  };
}

function createPublication(draft = createDraft()) {
  return {
    created_at: '2026-06-20T00:00:00.000Z',
    draft_schema_version: 1,
    id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    is_current: true,
    project_id: project.id,
    published_at: '2026-06-20T00:00:00.000Z',
    revision: 1,
    slug: project.slug,
    snapshot: {
      draft: draft.content,
      project: {
        eventCity: project.event_city,
        eventDatePrimary: project.event_date_primary,
        slug: project.slug,
        timezone: project.default_timezone,
      },
    },
    template_id: draft.content.templateKey,
  } as const;
}

describe('SRY-031 wedding readiness composition', () => {
  beforeEach(() => {
    getAggregateMock.mockReset().mockResolvedValue(defaultCounts);
    getDraftMock.mockReset().mockResolvedValue(createDraft());
    getPublishedMock.mockReset().mockResolvedValue(null);
    hasVerifiedActivationMock.mockReset().mockResolvedValue(false);
    ownedProjectContextMock.mockReset().mockResolvedValue(project);
  });

  it('derives a preview-first draft-ready state from normalized saved draft plus unverified activation', async () => {
    const readiness = await getWeddingReadinessForVerifiedProject(project);

    expect(readiness.invitation).toEqual({
      hasPublishedSnapshot: false,
      hasUnpublishedChanges: false,
      hasVerifiedActivation: false,
      state: 'draft_ready_unactivated',
    });
    expect(readiness.primaryAction).toEqual({
      href: `/dashboard/${project.id}/preview`,
      key: 'preview_invitation',
    });
  });

  it('uses verified activation state rather than browser return state before enabling manual publish', async () => {
    hasVerifiedActivationMock.mockResolvedValue(true);

    const readiness = await getWeddingReadinessForVerifiedProject(project);

    expect(readiness.invitation.state).toBe('ready_to_publish');
    expect(readiness.primaryAction).toEqual({
      key: 'publish_invitation',
    });
  });

  it('prioritizes guests only after a stable published snapshot exists', async () => {
    const draft = createDraft();
    getDraftMock.mockResolvedValue(draft);
    getPublishedMock.mockResolvedValue(createPublication(draft));
    getAggregateMock.mockResolvedValue({ ...defaultCounts, activeGuestCount: 2 });

    const readiness = await getWeddingReadinessForVerifiedProject(project);

    expect(readiness.invitation.state).toBe('published');
    expect(readiness.primaryAction.key).toBe('prepare_personal_invitations');
    expect(readiness.guests.guestsWithoutActivePersonalLinkCount).toBe(2);
  });

  it('uses only normalized saved content for the unpublished-change comparison', async () => {
    const draft = createDraft();
    const publicationDraft = createDraft();
    const publishedFirstEvent = publicationDraft.content.eventSchedule.events[0];

    if (!publishedFirstEvent) {
      throw new Error('Default draft must include a primary event.');
    }

    publicationDraft.content.eventSchedule.events[0] = {
      ...publishedFirstEvent,
      title: 'Akad Nikah Lama',
    };

    getDraftMock.mockResolvedValue(draft);
    getPublishedMock.mockResolvedValue(createPublication(publicationDraft));
    getAggregateMock.mockResolvedValue({ ...defaultCounts, activeGuestCount: 3 });

    const readiness = await getWeddingReadinessForVerifiedProject(project);

    expect(readiness.invitation.state).toBe('published_with_unpublished_changes');
    expect(readiness.primaryAction).toEqual({ key: 'review_changes' });
    expect(
      hasDeterministicSavedDraftChanges({
        draft,
        publication: createPublication(publicationDraft),
      }),
    ).toBe(true);
  });

  it('does not fabricate unpublished changes from a missing draft or browser-only state', () => {
    const publication = createPublication();

    expect(hasDeterministicSavedDraftChanges({ draft: null, publication })).toBe(false);
  });

  it('maps active current personal-link counts without exposing any guest or capability material', async () => {
    const draft = createDraft();
    getDraftMock.mockResolvedValue(draft);
    getPublishedMock.mockResolvedValue(createPublication(draft));
    getAggregateMock.mockResolvedValue({
      ...defaultCounts,
      activeGuestCount: 4,
      activeGuestbookCount: 1,
      activePersonalLinkGuestCount: 4,
      attendingCount: 1,
      confirmedAttendeeCount: 2,
      nonPendingRsvpCount: 1,
      whatsappAvailableCount: 2,
    });

    const readiness = await getWeddingReadinessForVerifiedProject(project);
    const serialized = JSON.stringify(readiness);

    expect(readiness.guests).toEqual({
      activeGuestCount: 4,
      activePersonalLinkGuestCount: 4,
      guestsWithoutActivePersonalLinkCount: 0,
      whatsappAvailableCount: 2,
      whatsappUnavailableCount: 2,
    });
    expect(readiness.responses.hasActivePersonalLinks).toBe(true);
    expect(readiness.primaryAction.key).toBe('view_guest_responses');
    expect(serialized).not.toMatch(
      /token_hash|personalUrl|rawPersonal|whatsapp_phone|guestbook.*message|payment.*(?:id|amount|status)|snapshot\.draft/i,
    );
  });

  it('keeps repository aggregate reads bounded without importing list-style guest, link, or guestbook loaders', async () => {
    const source = await readFile(
      resolve(process.cwd(), 'src/modules/readiness/wedding-readiness.repository.ts'),
      'utf8',
    );

    expect(source).toContain("select('id', { count: 'exact', head: true })");
    expect(source).toContain("select('rsvp_attendee_count.sum()')");
    expect(source).toContain(".eq('status', 'active')");
    expect(source).not.toMatch(
      /listActiveGuestsForVerifiedProject|listLatestGuestLinkStates|listGuestbookEntries/,
    );
    expect(source).not.toContain('token_hash');
  });
});
