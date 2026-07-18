import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultInvitationDraftContent } from '@/modules/invitations/invitation-draft.defaults';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

const {
  getEditorMock,
  getOwnedProjectContextMock,
  getPrivateGalleryMock,
  getReadinessMock,
  notFoundMock,
} = vi.hoisted(() => ({
  getEditorMock: vi.fn(),
  getOwnedProjectContextMock: vi.fn(),
  getPrivateGalleryMock: vi.fn(),
  getReadinessMock: vi.fn(),
  notFoundMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({ notFound: notFoundMock }));
vi.mock('@/components/projects/invitation-editor', () => ({
  InvitationEditor: ({
    galleryImages,
    project,
    projectId,
  }: {
    galleryImages: unknown[];
    project: { event_date_primary: string | null };
    projectId: string;
  }) => (
    <div
      data-editor-gallery-count={galleryImages.length}
      data-editor-primary-date={project.event_date_primary}
      data-editor-project-id={projectId}
    >
      Edit undangan
    </div>
  ),
}));
vi.mock('@/modules/auth/dashboard-request-context', () => ({
  getOwnedProjectContextForRequest: getOwnedProjectContextMock,
}));
vi.mock('@/modules/readiness', () => ({
  getWeddingReadinessForRequest: getReadinessMock,
}));
vi.mock('@/modules/invitations/invitation-editor.service', () => ({
  InvitationEditorDraftUnavailableError: class InvitationEditorDraftUnavailableError extends Error {},
  getInvitationEditorForVerifiedProject: getEditorMock,
}));
vi.mock('@/modules/media/media.service', () => ({
  getPrivateGalleryImagesForVerifiedProject: getPrivateGalleryMock,
}));

import InvitationEditorPage, {
  dynamic,
  fetchCache,
  revalidate,
} from '@/app/(dashboard)/dashboard/[projectId]/invitation/page';
import { InvitationEditorDraftUnavailableError } from '@/modules/invitations/invitation-editor.service';

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

const draft = {
  content: createDefaultInvitationDraftContent(project),
  created_at: '2026-06-20T00:00:00.000Z',
  deleted_at: null,
  id: 'draft-private-id',
  project_id: project.id,
  schema_version: 1,
  updated_at: '2026-06-20T00:00:00.000Z',
};

describe('SRY-016 private invitation editor route', () => {
  beforeEach(() => {
    getEditorMock.mockReset();
    getReadinessMock.mockReset().mockResolvedValue({
      identity: { coupleLabel: 'Raka & Nadia', templateKey: 'roselle' },
      invitation: {
        hasPublishedSnapshot: false,
        hasUnpublishedChanges: false,
        hasVerifiedActivation: false,
        publishedSlug: null,
        state: 'draft_incomplete',
      },
    });
    getOwnedProjectContextMock.mockReset().mockResolvedValue(project);
    getPrivateGalleryMock.mockReset().mockResolvedValue([
      {
        alt: 'Foto pasangan 1',
        id: '11111111-1111-4111-8111-111111111111',
        src: '/dashboard/media/11111111-1111-4111-8111-111111111111',
      },
    ]);
    notFoundMock.mockReset();
    notFoundMock.mockImplementation(() => {
      throw new Error('NEXT_NOT_FOUND');
    });
  });

  it('is private dynamic no-store and renders only the verified owner editor payload', async () => {
    getEditorMock.mockResolvedValue({ draft, project });

    const page = await InvitationEditorPage({ params: Promise.resolve({ projectId: project.id }) });
    const html = renderToStaticMarkup(page);

    expect(dynamic).toBe('force-dynamic');
    expect(revalidate).toBe(0);
    expect(fetchCache).toBe('force-no-store');
    expect(getOwnedProjectContextMock).toHaveBeenCalledWith(project.id);
    expect(getEditorMock).toHaveBeenCalledWith(project);
    expect(getReadinessMock).toHaveBeenCalledWith(project.id);
    expect(getPrivateGalleryMock).toHaveBeenCalledWith({
      draftImageIds: draft.content.gallery.imageIds,
      project,
    });
    expect(html).toContain('Edit undangan');
    expect(html).toContain(`data-editor-project-id="${project.id}"`);
    expect(html).toContain('data-editor-gallery-count="1"');
    expect(html).toContain(`data-editor-primary-date="${project.event_date_primary}"`);
    expect(html).not.toContain('draft-private-id');
    expect(html).not.toContain(project.account_id);
  });

  it('uses the same unavailable route for cross-owner and unavailable draft cases', async () => {
    getOwnedProjectContextMock.mockRejectedValueOnce(new ProjectAccessDeniedError());

    await expect(
      InvitationEditorPage({
        params: Promise.resolve({ projectId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' }),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND');

    getEditorMock.mockRejectedValueOnce(new InvitationEditorDraftUnavailableError());

    await expect(
      InvitationEditorPage({ params: Promise.resolve({ projectId: project.id }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('uses the request-local verified project context without public snapshot, cookie, or Host dependencies', async () => {
    const source = await readFile(
      path.resolve(process.cwd(), 'src/app/(dashboard)/dashboard/[projectId]/invitation/page.tsx'),
      'utf8',
    );

    expect(source).toContain('getOwnedProjectContextForRequest');
    expect(source).toContain('getInvitationEditorForVerifiedProject');
    expect(source).toContain('getWeddingReadinessForRequest');
    expect(source).toContain('getPrivateGalleryImagesForVerifiedProject');
    expect(source).not.toContain('getInvitationEditorForCurrentUser');
    expect(source).not.toContain('createServerSupabaseClient');
    expect(source).not.toContain('cookies(');
    expect(source).not.toContain('publications');
    expect(source).not.toContain('headers(');
  });
});
