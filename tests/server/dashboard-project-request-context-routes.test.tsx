import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

const {
  getGalleryMock,
  getHistoryMock,
  getOverviewMock,
  getOwnedProjectContextMock,
  getPaymentOverviewMock,
  notFoundMock,
} = vi.hoisted(() => ({
  getGalleryMock: vi.fn(),
  getHistoryMock: vi.fn(),
  getOverviewMock: vi.fn(),
  getOwnedProjectContextMock: vi.fn(),
  getPaymentOverviewMock: vi.fn(),
  notFoundMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({ notFound: notFoundMock }));
vi.mock('@/modules/auth/dashboard-request-context', () => ({
  getOwnedProjectContextForRequest: getOwnedProjectContextMock,
}));
vi.mock('@/components/projects/project-overview-bootstrap', () => ({
  ProjectOverviewBootstrap: ({ project }: { project: { id: string } }) => (
    <div data-project-overview-id={project.id}>Overview</div>
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
  getOwnedProjectInvitationOverviewForVerifiedProject: getOverviewMock,
}));
vi.mock('@/modules/media/media.service', () => ({
  getPrivateGalleryImagesForVerifiedProject: getGalleryMock,
}));
vi.mock('@/modules/payments/payment.service', () => ({
  getPaymentHistoryForVerifiedProject: getHistoryMock,
  getPaymentOverviewForVerifiedProject: getPaymentOverviewMock,
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

function projectParams(projectId = project.id) {
  return { params: Promise.resolve({ projectId }) };
}

describe('SRY-021A project routes request-local verified context', () => {
  beforeEach(() => {
    getGalleryMock.mockReset().mockResolvedValue([]);
    getHistoryMock.mockReset().mockResolvedValue({ payments: [], project });
    getOverviewMock.mockReset().mockResolvedValue({
      draft,
      guestCount: 0,
      project,
      publication: null,
    });
    getOwnedProjectContextMock.mockReset().mockResolvedValue(project);
    getPaymentOverviewMock.mockReset().mockResolvedValue({
      configuration: null,
      isConfigured: false,
      payment: null,
      publishEligibility: { allowed: false, reason: 'payment_required' },
    });
    notFoundMock.mockReset();
    notFoundMock.mockImplementation(() => {
      throw new Error('NEXT_NOT_FOUND');
    });
  });

  it('uses one server-verified project context for project overview data and payment overview', async () => {
    const page = await ProjectDashboardPage(projectParams());
    const html = renderToStaticMarkup(page);

    expect(getOwnedProjectContextMock).toHaveBeenCalledTimes(1);
    expect(getOwnedProjectContextMock).toHaveBeenCalledWith(project.id);
    expect(getOverviewMock).toHaveBeenCalledWith(project);
    expect(getPaymentOverviewMock).toHaveBeenCalledWith(project);
    expect(html).toContain(`data-project-overview-id="${project.id}"`);
  });

  it('uses the same verified project context for gallery draft and media resolution', async () => {
    const page = await GalleryPage(projectParams());
    const html = renderToStaticMarkup(page);

    expect(getOwnedProjectContextMock).toHaveBeenCalledTimes(1);
    expect(getOverviewMock).toHaveBeenCalledWith(project);
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

  it('keeps foreign project handling generic before overview, media, or payment reads', async () => {
    getOwnedProjectContextMock.mockRejectedValue(new ProjectAccessDeniedError());

    await expect(ProjectDashboardPage(projectParams('project-foreign'))).rejects.toThrow(
      'NEXT_NOT_FOUND',
    );

    expect(getOverviewMock).not.toHaveBeenCalled();
    expect(getPaymentOverviewMock).not.toHaveBeenCalled();
  });
});
