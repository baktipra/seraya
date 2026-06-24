import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultInvitationDraftContent } from '@/modules/invitations/invitation-draft.defaults';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

const {
  getOverviewMock,
  getOwnedProjectContextMock,
  getPrivateDraftMock,
  getPrivateGalleryMock,
  notFoundMock,
} = vi.hoisted(() => ({
  getOverviewMock: vi.fn(),
  getOwnedProjectContextMock: vi.fn(),
  getPrivateDraftMock: vi.fn(),
  getPrivateGalleryMock: vi.fn(),
  notFoundMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  notFound: notFoundMock,
}));
vi.mock('@/modules/auth/dashboard-request-context', () => ({
  getOwnedProjectContextForRequest: getOwnedProjectContextMock,
}));
vi.mock('@/components/projects/gallery-manager', () => ({
  GalleryManager: ({
    initialImages,
    isPublished,
    projectId,
  }: {
    initialImages: Array<{ id: string }>;
    isPublished: boolean;
    projectId: string;
  }) => (
    <div
      data-gallery-image-ids={initialImages.map((image) => image.id).join(',')}
      data-gallery-project-id={projectId}
      data-gallery-published={String(isPublished)}
    >
      Galeri
    </div>
  ),
}));
vi.mock('@/modules/invitations/invitation-draft.service', () => ({
  getOwnedProjectInvitationOverviewForVerifiedProject: getOverviewMock,
  getOwnedProjectPrivateInvitationDraftForVerifiedProject: getPrivateDraftMock,
}));
vi.mock('@/modules/media/media.service', () => ({
  getPrivateGalleryImagesForVerifiedProject: getPrivateGalleryMock,
}));

import GalleryPage from '@/app/(dashboard)/dashboard/[projectId]/gallery/page';

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
  status: 'published',
};

const firstImageId = '11111111-1111-4111-8111-111111111111';
const secondImageId = '22222222-2222-4222-8222-222222222222';

function createPrivateDraft(imageIds: string[] = []) {
  const content = createDefaultInvitationDraftContent(project);
  content.gallery = { enabled: imageIds.length > 0, imageIds };

  return {
    draft: {
      content,
      created_at: '2026-06-20T00:00:00.000Z',
      deleted_at: null,
      id: 'draft-private-id',
      project_id: project.id,
      schema_version: 1,
      updated_at: '2026-06-20T00:00:00.000Z',
    },
    project,
  };
}

describe('SRY-021B private gallery route', () => {
  beforeEach(() => {
    getOverviewMock.mockReset();
    getOwnedProjectContextMock.mockReset().mockResolvedValue(project);
    getPrivateDraftMock.mockReset().mockResolvedValue(createPrivateDraft());
    getPrivateGalleryMock.mockReset().mockResolvedValue([]);
    notFoundMock.mockReset();
    notFoundMock.mockImplementation(() => {
      throw new Error('NEXT_NOT_FOUND');
    });
  });

  it('loads only the private draft and one bounded gallery-media read for the verified project', async () => {
    const page = await GalleryPage({ params: Promise.resolve({ projectId: project.id }) });
    const html = renderToStaticMarkup(page);

    expect(getOwnedProjectContextMock).toHaveBeenCalledWith(project.id);
    expect(getPrivateDraftMock).toHaveBeenCalledWith(project);
    expect(getPrivateGalleryMock).toHaveBeenCalledWith({ draftImageIds: [], project });
    expect(getPrivateGalleryMock).toHaveBeenCalledTimes(1);
    expect(getOverviewMock).not.toHaveBeenCalled();
    expect(html).toContain(`data-gallery-project-id="${project.id}"`);
    expect(html).toContain('data-gallery-published="true"');
  });

  it('preserves the asset order returned by the bounded private gallery resolver', async () => {
    getPrivateDraftMock.mockResolvedValue(createPrivateDraft([secondImageId, firstImageId]));
    getPrivateGalleryMock.mockResolvedValue([
      { alt: 'Foto pasangan 1', id: secondImageId, src: `/dashboard/media/${secondImageId}` },
      { alt: 'Foto pasangan 2', id: firstImageId, src: `/dashboard/media/${firstImageId}` },
    ]);

    const page = await GalleryPage({ params: Promise.resolve({ projectId: project.id }) });
    const html = renderToStaticMarkup(page);

    expect(getPrivateGalleryMock).toHaveBeenCalledWith({
      draftImageIds: [secondImageId, firstImageId],
      project,
    });
    expect(html).toContain(`data-gallery-image-ids="${secondImageId},${firstImageId}"`);
  });

  it('keeps foreign-owned or soft-deleted projects unavailable before draft or media reads', async () => {
    getOwnedProjectContextMock.mockRejectedValue(new ProjectAccessDeniedError());

    await expect(
      GalleryPage({ params: Promise.resolve({ projectId: 'foreign-project' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');

    expect(getPrivateDraftMock).not.toHaveBeenCalled();
    expect(getPrivateGalleryMock).not.toHaveBeenCalled();
  });

  it('does not render gallery management when the active draft is unavailable', async () => {
    getPrivateDraftMock.mockResolvedValue({ draft: null, project });

    await expect(
      GalleryPage({ params: Promise.resolve({ projectId: project.id }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');

    expect(getPrivateGalleryMock).not.toHaveBeenCalled();
  });
});
