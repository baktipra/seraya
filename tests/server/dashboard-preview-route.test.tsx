import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
vi.mock('@/modules/invitations/invitation-draft.service', () => ({
  getOwnedProjectInvitationOverviewForVerifiedProject: getOverviewMock,
  getOwnedProjectPrivateInvitationDraftForVerifiedProject: getPrivateDraftMock,
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

const ownedPrivateDraft = {
  draft: {
    content: createDefaultInvitationDraftContent(project),
    created_at: '2026-06-20T00:00:00.000Z',
    deleted_at: null,
    id: 'draft-private-id',
    project_id: project.id,
    schema_version: 1,
    updated_at: '2026-06-20T00:00:00.000Z',
  },
  project,
};

describe('SRY-021B private invitation preview route', () => {
  beforeEach(() => {
    getOverviewMock.mockReset();
    getOwnedProjectContextMock.mockReset().mockResolvedValue(project);
    getPrivateDraftMock.mockReset().mockResolvedValue(ownedPrivateDraft);
    getPrivateGalleryMock.mockReset().mockResolvedValue([]);
    notFoundMock.mockReset();
    notFoundMock.mockImplementation(() => {
      throw new Error('NEXT_NOT_FOUND');
    });
  });

  it('renders the owner preview from the narrow draft-plus-gallery read path only', async () => {
    const page = await InvitationPreviewPage({
      params: Promise.resolve({ projectId: project.id }),
    });
    const html = renderToStaticMarkup(page);

    expect(getOwnedProjectContextMock).toHaveBeenCalledWith(project.id);
    expect(getPrivateDraftMock).toHaveBeenCalledWith(project);
    expect(getPrivateGalleryMock).toHaveBeenCalledWith({
      draftImageIds: [],
      project,
    });
    expect(getPrivateGalleryMock).toHaveBeenCalledTimes(1);
    expect(getOverviewMock).not.toHaveBeenCalled();
    expect(html).toContain('← Kembali ke project');
    expect(html).toContain('Pratinjau undangan');
    expect(html).toContain('Belum dipublikasikan');
    expect(html).toContain('Raka &amp; Nadia');
    expect(html).not.toContain('draft-private-id');
    expect(html).not.toContain(project.account_id);
  });

  it('renders the saved private draft schedule in its owner-defined order without loading public or guest data', async () => {
    const draft = createDefaultInvitationDraftContent(project);
    const first = draft.eventSchedule.events[0]!;
    draft.eventSchedule.events = [
      {
        ...first,
        mapsUrl: 'https://maps.example.test/akad',
        title: 'Akad Nikah',
        venueAddress: 'Jalan Mawar 1',
        venueName: 'Masjid Seraya',
      },
      {
        ...first,
        date: '2027-08-18',
        endTime: null,
        id: '11111111-1111-4111-8111-111111111111',
        mapsUrl: null,
        startTime: '19:00',
        title: 'Resepsi',
        venueAddress: null,
        venueName: null,
      },
    ];
    getPrivateDraftMock.mockResolvedValue({
      ...ownedPrivateDraft,
      draft: { ...ownedPrivateDraft.draft, content: draft },
    });

    const page = await InvitationPreviewPage({
      params: Promise.resolve({ projectId: project.id }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain('Akad Nikah');
    expect(html).toContain('Resepsi');
    expect(html.indexOf('Akad Nikah')).toBeLessThan(html.indexOf('Resepsi'));
    expect(html).toContain('Masjid Seraya');
    expect(html).toContain('href="https://maps.example.test/akad"');
    expect(getOverviewMock).not.toHaveBeenCalled();
  });

  it('renders the selected private draft template without reading publication data', async () => {
    const draft = createDefaultInvitationDraftContent(project);
    draft.templateKey = 'aruna';
    getPrivateDraftMock.mockResolvedValue({
      ...ownedPrivateDraft,
      draft: { ...ownedPrivateDraft.draft, content: draft },
    });

    const page = await InvitationPreviewPage({
      params: Promise.resolve({ projectId: project.id }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain('data-template="aruna"');
    expect(getOverviewMock).not.toHaveBeenCalled();
  });

  it('renders saved private-draft Amplop Digital without publication, payment, or guest reads', async () => {
    const draft = createDefaultInvitationDraftContent(project);
    draft.digitalGift = {
      accounts: [
        {
          accountHolder: 'Raka Pratama',
          accountNumber: '123456789012',
          id: '11111111-1111-4111-8111-111111111111',
          providerName: 'Bank Seraya',
        },
      ],
      enabled: true,
      heading: 'Amplop Digital',
      lead: 'Terima kasih atas doa terbaik Anda.',
    };
    getPrivateDraftMock.mockResolvedValue({
      ...ownedPrivateDraft,
      draft: { ...ownedPrivateDraft.draft, content: draft },
    });

    const page = await InvitationPreviewPage({
      params: Promise.resolve({ projectId: project.id }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain('Amplop Digital');
    expect(html).toContain('Bank Seraya');
    expect(html).toContain('123456789012');
    expect(html).toContain('Salin nomor');
    expect(getOverviewMock).not.toHaveBeenCalled();
  });

  it('renders only owner-resolved gallery proxy images in the private preview', async () => {
    const imageId = '11111111-1111-4111-8111-111111111111';
    const draft = createDefaultInvitationDraftContent(project);
    draft.gallery = { enabled: true, imageIds: [imageId] };
    getPrivateDraftMock.mockResolvedValue({
      ...ownedPrivateDraft,
      draft: { ...ownedPrivateDraft.draft, content: draft },
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

  it('does not render a guessed cross-account or soft-deleted project preview', async () => {
    getOwnedProjectContextMock.mockRejectedValue(new ProjectAccessDeniedError());

    await expect(
      InvitationPreviewPage({
        params: Promise.resolve({ projectId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' }),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND');

    expect(getPrivateDraftMock).not.toHaveBeenCalled();
    expect(getPrivateGalleryMock).not.toHaveBeenCalled();
  });

  it('uses the preview render surface without constructing personal invitation slots', async () => {
    const testDirectory = path.dirname(fileURLToPath(import.meta.url));
    const routeSource = await readFile(
      path.resolve(
        testDirectory,
        '../../src/app/(dashboard)/dashboard/[projectId]/preview/page.tsx',
      ),
      'utf8',
    );

    expect(routeSource).toContain('surface="preview"');
    expect(routeSource).not.toContain('personalSlots');
    expect(routeSource).not.toContain('personal-invitation');
    expect(routeSource).not.toContain('guestToken');
  });

  it('does not render an active project when its draft is absent or soft-deleted', async () => {
    getPrivateDraftMock.mockResolvedValue({ ...ownedPrivateDraft, draft: null });

    await expect(
      InvitationPreviewPage({ params: Promise.resolve({ projectId: project.id }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');

    expect(getPrivateGalleryMock).not.toHaveBeenCalled();
  });
});
