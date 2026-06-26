import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

const {
  getGalleryMock,
  getHistoryMock,
  getOwnedProjectContextMock,
  getPrivateDraftMock,
  getPaymentOverviewMock,
  getReadinessMock,
  notFoundMock,
} = vi.hoisted(() => ({
  getGalleryMock: vi.fn(),
  getHistoryMock: vi.fn(),
  getOwnedProjectContextMock: vi.fn(),
  getPrivateDraftMock: vi.fn(),
  getPaymentOverviewMock: vi.fn(),
  getReadinessMock: vi.fn(),
  notFoundMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({ notFound: notFoundMock }));
vi.mock('@/modules/auth/dashboard-request-context', () => ({
  getOwnedProjectContextForRequest: getOwnedProjectContextMock,
}));
vi.mock('@/components/projects/project-overview-bootstrap', () => ({
  ProjectOverviewBootstrap: ({ projectId }: { projectId: string }) => (
    <div data-project-overview-id={projectId}>Overview</div>
  ),
}));
vi.mock('@/components/projects/gallery-manager', () => ({
  GalleryManager: ({ projectId }: { projectId: string }) => (
    <div data-gallery-project-id={projectId}>Galeri</div>
  ),
}));
vi.mock('@/components/projects/payment-activation-controls', () => ({
  PaymentActivationControls: () => <div>Aktivasi</div>,
}));
vi.mock('@/modules/invitations/invitation-draft.service', () => ({
  getOwnedProjectPrivateInvitationDraftForVerifiedProject: getPrivateDraftMock,
}));
vi.mock('@/modules/media/media.service', () => ({
  getPrivateGalleryImagesForVerifiedProject: getGalleryMock,
}));
vi.mock('@/modules/payments/payment.service', () => ({
  getPaymentHistoryForVerifiedProject: getHistoryMock,
  getPaymentOverviewForVerifiedProject: getPaymentOverviewMock,
}));
vi.mock('@/modules/readiness', () => ({
  getWeddingReadinessForRequest: getReadinessMock,
}));

import BillingPage from '@/app/(dashboard)/dashboard/[projectId]/billing/page';
import GalleryPage from '@/app/(dashboard)/dashboard/[projectId]/gallery/page';
import ProjectDashboardPage from '@/app/(dashboard)/dashboard/[projectId]/page';

const project = {
  account_id: 'owner-a',
  default_timezone: 'Asia/Jakarta',
  deleted_at: null,
  event_city: 'Jakarta',
  event_date_primary: '2027-08-17',
  id: 'project-a',
  person_one_name: 'Raka',
  person_two_name: 'Nadia',
  slug: 'raka-nadia',
  status: 'draft',
};

const draft = {
  content: { gallery: { imageIds: [] } },
};

const readiness = {
  identity: { coupleLabel: 'Raka & Nadia', templateKey: 'roselle' },
  invitation: {
    hasPublishedSnapshot: false,
    hasUnpublishedChanges: false,
    hasVerifiedActivation: false,
    state: 'draft_ready_unactivated',
  },
  guests: {
    activeGuestCount: 0,
    activePersonalLinkGuestCount: 0,
    guestsWithoutActivePersonalLinkCount: 0,
    whatsappAvailableCount: 0,
    whatsappUnavailableCount: 0,
  },
  primaryAction: { href: `/dashboard/${project.id}/preview`, key: 'preview_invitation' },
  responses: {
    activeGuestbookCount: 0,
    attendingCount: 0,
    confirmedAttendeeCount: 0,
    declinedCount: 0,
    hasActivePersonalLinks: false,
    nonPendingRsvpCount: 0,
  },
};

function projectParams(projectId = project.id) {
  return { params: Promise.resolve({ projectId }) };
}

describe('SRY-031 project routes request-local verified context', () => {
  beforeEach(() => {
    getGalleryMock.mockReset().mockResolvedValue([]);
    getHistoryMock.mockReset().mockResolvedValue({ payments: [], project });
    getPrivateDraftMock.mockReset().mockResolvedValue({ draft, project });
    getOwnedProjectContextMock.mockReset().mockResolvedValue(project);
    getPaymentOverviewMock.mockReset().mockResolvedValue({
      configuration: null,
      isConfigured: false,
      payment: null,
      publishEligibility: { allowed: false, reason: 'payment_required' },
    });
    getReadinessMock.mockReset().mockResolvedValue(readiness);
    notFoundMock.mockReset();
    notFoundMock.mockImplementation(() => {
      throw new Error('NEXT_NOT_FOUND');
    });
  });

  it('uses one owner-scoped readiness projection for the project overview', async () => {
    const page = await ProjectDashboardPage(projectParams());
    const html = renderToStaticMarkup(page);

    expect(getReadinessMock).toHaveBeenCalledTimes(1);
    expect(getReadinessMock).toHaveBeenCalledWith(project.id);
    expect(html).toContain(`data-project-overview-id="${project.id}"`);
  });

  it('uses the same verified project context for gallery draft and media resolution', async () => {
    const page = await GalleryPage(projectParams());
    const html = renderToStaticMarkup(page);

    expect(getOwnedProjectContextMock).toHaveBeenCalledTimes(1);
    expect(getPrivateDraftMock).toHaveBeenCalledWith(project);
    expect(getGalleryMock).toHaveBeenCalledWith({ draftImageIds: [], project });
    expect(html).toContain(`data-gallery-project-id="${project.id}"`);
  });

  it('uses the verified project context for billing while preserving current payment overview behavior', async () => {
    const page = await BillingPage(projectParams());
    const html = renderToStaticMarkup(page);

    expect(getOwnedProjectContextMock).toHaveBeenCalledTimes(1);
    expect(getHistoryMock).toHaveBeenCalledWith(project);
    expect(getPaymentOverviewMock).toHaveBeenCalledWith(project);
    expect(html).toContain('Tagihan undangan');
  });

  it('keeps foreign project handling generic before overview composition', async () => {
    getReadinessMock.mockRejectedValue(new ProjectAccessDeniedError());

    await expect(ProjectDashboardPage(projectParams('project-foreign'))).rejects.toThrow(
      'NEXT_NOT_FOUND',
    );
  });
});
