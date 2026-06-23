import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getCurrentPublishedMock,
  getOwnedProjectMock,
  getPaymentOverviewMock,
  publishSnapshotMock,
  requireCurrentUserMock,
} = vi.hoisted(() => ({
  getCurrentPublishedMock: vi.fn(),
  getOwnedProjectMock: vi.fn(),
  getPaymentOverviewMock: vi.fn(),
  publishSnapshotMock: vi.fn(),
  requireCurrentUserMock: vi.fn(),
}));

vi.mock('@/modules/auth/current-user', () => ({ requireCurrentUser: requireCurrentUserMock }));
vi.mock('@/modules/projects/project.repository', () => ({
  getOwnedProjectById: getOwnedProjectMock,
}));
vi.mock('@/modules/payments/payment.service', () => ({
  getPaymentOverviewForVerifiedProject: getPaymentOverviewMock,
}));
vi.mock('../publication.repository', async () => {
  const actual = await vi.importActual<typeof import('../publication.repository')>(
    '../publication.repository',
  );

  return {
    ...actual,
    getCurrentPublishedInvitationForVerifiedProject: getCurrentPublishedMock,
    publishInvitationSnapshot: publishSnapshotMock,
  };
});

import { PublicationPaymentRequiredError } from '../publication.repository';
import type { PublishedInvitationSnapshot } from '../publication.types';
import { publishInvitationForCurrentUser } from '../publication.service';

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
  status: 'draft' as const,
};

function snapshot(): PublishedInvitationSnapshot {
  return {
    created_at: '2026-06-21T00:00:00.000Z',
    draft_schema_version: 1,
    id: '33333333-3333-4333-8333-333333333333',
    is_current: true,
    project_id: project.id,
    published_at: '2026-06-21T00:00:00.000Z',
    revision: 1,
    slug: project.slug,
    snapshot: {
      draft: {
        closing: { enabled: false, message: null, signature: null },
        couple: {
          personOne: { displayName: 'Raka', fullName: null, parentLine: null },
          personTwo: { displayName: 'Nadia', fullName: null, parentLine: null },
        },
        events: {
          ceremony: { date: null, enabled: false, endTime: null, startTime: null, title: null },
          enabled: false,
          primaryDate: '2027-08-17',
          reception: { date: null, enabled: false, endTime: null, startTime: null, title: null },
        },
        gallery: { enabled: false, imageIds: [] },
        hero: { eyebrow: 'The Wedding Of', subtitle: null, title: 'Raka & Nadia' },
        location: { address: null, enabled: false, mapsUrl: null, venueName: null },
        meta: { locale: 'id-ID', timezone: 'Asia/Jakarta' },
        rsvp: { enabled: true, heading: null, lead: null },
        story: { body: null, enabled: false, heading: null },
      },
      project: {
        eventCity: 'Jakarta',
        eventDatePrimary: '2027-08-17',
        slug: project.slug,
        timezone: 'Asia/Jakarta',
      },
    },
    template_id: 'roselle',
  };
}

describe('publication service payment gate', () => {
  beforeEach(() => {
    requireCurrentUserMock.mockReset().mockResolvedValue({ id: project.account_id });
    getOwnedProjectMock.mockReset().mockResolvedValue(project);
    getCurrentPublishedMock.mockReset().mockResolvedValue(null);
    publishSnapshotMock.mockReset().mockResolvedValue(snapshot());
    getPaymentOverviewMock.mockReset().mockResolvedValue({
      publishEligibility: { allowed: false, reason: 'payment_required' },
    });
  });

  it('blocks a bypassed publish action before it reaches the publication RPC', async () => {
    await expect(publishInvitationForCurrentUser(project.id)).rejects.toBeInstanceOf(
      PublicationPaymentRequiredError,
    );
    expect(publishSnapshotMock).not.toHaveBeenCalled();
  });

  it('allows manual publication only after the verified-payment policy passes', async () => {
    getPaymentOverviewMock.mockResolvedValue({
      publishEligibility: { allowed: true, reason: 'verified_payment' },
    });

    await expect(publishInvitationForCurrentUser(project.id)).resolves.toMatchObject({
      snapshot: { slug: project.slug },
    });
    expect(publishSnapshotMock).toHaveBeenCalledWith(project.id);
  });
});
