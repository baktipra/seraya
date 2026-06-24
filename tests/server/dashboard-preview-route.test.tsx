import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultInvitationDraftContent } from '@/modules/invitations/invitation-draft.defaults';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

const { getOverviewMock, getOwnedProjectContextMock, getPrivateGalleryMock, notFoundMock } =
  vi.hoisted(() => ({
    getOverviewMock: vi.fn(),
    getOwnedProjectContextMock: vi.fn(),
    getPrivateGalleryMock: vi.fn(),
    notFoundMock: vi.fn(),
  }));

vi.mock('next/navigation', () => ({
  notFound: notFoundMock,
}));
vi.mock('@/modules/auth/dashboard-request-context', () => ({
  getOwnedProjectContextForRequest: getOwnedProjectContextMock,
}));
vi.mock('@/modules/invitations/invitation-draft.service', () => ({
  getOwnedProjectInvitationOverviewForVerifiedProject: getOverviewMock,
}));
vi.mock('@/modules/media/media.service', () => ({
  getPrivateGalleryImagesForVerifiedProject: getPrivateGalleryMock,
}));

import InvitationPreviewPage from '@/app/(dashboard)/dashboard/[projectId]/preview/page';

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

const ownedOverview = {
  draft: {
    content: createDefaultInvitationDraftContent(project),
    created_at: '2026-06-20T00:00:00.000Z',
    deleted_at: null,
    id: 'draft-private-id',
    project_id: project.id,
    schema_version: 1,
    updated_at: '2026-06-20T00:00:00.000Z',
  },
  publication: null,
  project,
};

describe('SRY-007 private invitation preview route', () => {
  beforeEach(() => {
    getOverviewMock.mockReset();
    getOwnedProjectContextMock.mockReset().mockResolvedValue(project);
    getPrivateGalleryMock.mockReset();
    getPrivateGalleryMock.mockResolvedValue([]);
    notFoundMock.mockReset();
    notFoundMock.mockImplementation(() => {
      throw new Error('NEXT_NOT_FOUND');
    });
  });

  it('renders the owner preview with a dashboard toolbar and no private record metadata', async () => {
    getOverviewMock.mockResolvedValue(ownedOverview);

    const page = await InvitationPreviewPage({
      params: Promise.resolve({ projectId: project.id }),
    });
    const html = renderToStaticMarkup(page);

    expect(getOwnedProjectContextMock).toHaveBeenCalledWith(project.id);
    expect(getOverviewMock).toHaveBeenCalledWith(project);
    expect(getPrivateGalleryMock).toHaveBeenCalledWith({
      draftImageIds: [],
      project,
    });
    expect(html).toContain('← Kembali ke project');
    expect(html).toContain('Pratinjau undangan');
    expect(html).toContain('Belum dipublikasikan');
    expect(html).toContain('Raka &amp; Nadia');
    expect(html).not.toContain('draft-private-id');
    expect(html).not.toContain(project.account_id);
  });

  it('renders only owner-resolved gallery proxy images in the private preview', async () => {
    const imageId = '11111111-1111-4111-8111-111111111111';
    const draft = createDefaultInvitationDraftContent(project);
    draft.gallery = { enabled: true, imageIds: [imageId] };
    getOverviewMock.mockResolvedValue({
      ...ownedOverview,
      draft: { ...ownedOverview.draft, content: draft },
    });
    getPrivateGalleryMock.mockResolvedValue([
      { alt: 'Foto pasangan 1', id: imageId, src: `/dashboard/media/${imageId}` },
    ]);

    const page = await InvitationPreviewPage({
      params: Promise.resolve({ projectId: project.id }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain(`src="/dashboard/media/${imageId}"`);
    expect(html).toContain('alt="Foto pasangan 1"');
    expect(html).not.toContain('storage_path');
    expect(html).not.toContain('projects/');
  });

  it('does not render a guessed cross-account project preview', async () => {
    getOwnedProjectContextMock.mockRejectedValue(new ProjectAccessDeniedError());

    await expect(
      InvitationPreviewPage({
        params: Promise.resolve({ projectId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' }),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('does not render an active project when its draft is absent or soft-deleted', async () => {
    getOverviewMock.mockResolvedValue({ ...ownedOverview, draft: null });

    await expect(
      InvitationPreviewPage({ params: Promise.resolve({ projectId: project.id }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });
});
