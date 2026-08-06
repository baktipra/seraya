import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultInvitationDraftContent } from '@/modules/invitations/invitation-draft.defaults';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

const {
  getAudioMock,
  getEditorMock,
  getOwnedProjectContextMock,
  getPaymentOverviewMock,
  getPublishedSnapshotMock,
  getReadinessMock,
  notFoundMock,
} = vi.hoisted(() => ({
  getAudioMock: vi.fn(),
  getEditorMock: vi.fn(),
  getOwnedProjectContextMock: vi.fn(),
  getPaymentOverviewMock: vi.fn(),
  getPublishedSnapshotMock: vi.fn(),
  getReadinessMock: vi.fn(),
  notFoundMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({ notFound: notFoundMock }));
vi.mock('@/components/projects/invitation-studio-provider', () => ({
  InvitationStudioProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/projects/invitation-task-workspace', () => ({
  InvitationTaskWorkspace: ({
    draft,
    projectId,
  }: {
    draft: { content: { gallery: { imageIds: string[] } } };
    projectId: string;
  }) => (
    <section
      data-editor-gallery-count={draft.content.gallery.imageIds.length}
      data-editor-project-id={projectId}
      data-private-invitation-task-workspace
    >
      Edit undangan
    </section>
  ),
}));
vi.mock('@/modules/auth/dashboard-request-context', () => ({
  getOwnedProjectContextForRequest: getOwnedProjectContextMock,
}));
vi.mock('@/modules/readiness', () => ({
  getInvitationReadinessForVerifiedProject: getReadinessMock,
}));
vi.mock('@/modules/invitations/invitation-editor.service', () => ({
  InvitationEditorDraftUnavailableError: class InvitationEditorDraftUnavailableError extends Error {},
  getInvitationEditorForVerifiedProject: getEditorMock,
}));
vi.mock('@/modules/media/invitation-audio.service', () => ({
  getInvitationAudioSummaryForVerifiedProject: getAudioMock,
}));
vi.mock('@/modules/payments', () => ({
  getPaymentOverviewForVerifiedProject: getPaymentOverviewMock,
}));
vi.mock('@/modules/publications/publication.repository', () => ({
  getCurrentPublishedInvitationForVerifiedProject: getPublishedSnapshotMock,
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

const galleryAssetId = '11111111-1111-4111-8111-111111111111';

const draft = {
  content: {
    ...createDefaultInvitationDraftContent(project),
    gallery: { enabled: true, imageIds: [galleryAssetId] },
  },
  created_at: '2026-06-20T00:00:00.000Z',
  deleted_at: null,
  id: 'draft-private-id',
  project_id: project.id,
  schema_version: 1,
  updated_at: '2026-06-20T00:00:00.000Z',
};

const readiness = {
  identity: { coupleLabel: 'Raka & Nadia', templateKey: 'roselle' },
  invitation: {
    hasPublishedSnapshot: false,
    hasUnpublishedChanges: false,
    hasVerifiedActivation: false,
    publishedSlug: null,
    state: 'draft_incomplete',
  },
};

const paymentOverview = {
  configuration: null,
  isConfigured: false,
  payment: null,
  publishEligibility: { allowed: false, reason: 'payment_required' },
};

describe('SRY-016 private invitation editor route', () => {
  beforeEach(() => {
    getAudioMock.mockReset().mockResolvedValue(null);
    getEditorMock.mockReset();
    getPaymentOverviewMock.mockReset().mockResolvedValue(paymentOverview);
    getPublishedSnapshotMock.mockReset().mockResolvedValue(null);
    getReadinessMock.mockReset().mockResolvedValue(readiness);
    getOwnedProjectContextMock.mockReset().mockResolvedValue(project);
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
    expect(getReadinessMock).toHaveBeenCalledWith(project, { draft });
    expect(getAudioMock).toHaveBeenCalledWith({
      configuration: draft.content.audio,
      project,
    });
    expect(getPaymentOverviewMock).toHaveBeenCalledWith(project);
    expect(getPublishedSnapshotMock).toHaveBeenCalledWith(project);
    expect(html).toContain('Edit undangan');
    expect(html).toContain(`data-editor-project-id="${project.id}"`);
    expect(html).toContain('data-editor-gallery-count="1"');
    expect(html).toContain('data-private-invitation-task-workspace');
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

  it('reuses the request-local verified project for all private Studio composition', async () => {
    const source = await readFile(
      path.resolve(process.cwd(), 'src/app/(dashboard)/dashboard/[projectId]/invitation/page.tsx'),
      'utf8',
    );

    expect(source).toContain('getOwnedProjectContextForRequest');
    expect(source).toContain('getInvitationEditorForVerifiedProject');
    expect(source).toContain('getInvitationReadinessForVerifiedProject(project, {');
    expect(source).toContain('getInvitationAudioSummaryForVerifiedProject({');
    expect(source).toContain('getPaymentOverviewForVerifiedProject(project)');
    expect(source).toContain('getCurrentPublishedInvitationForVerifiedProject(project)');
    expect(source).toContain('draft: editor.draft');
    expect(source).toContain('getDeferredGalleryImages');
    expect(source).toContain('src: `/dashboard/media/${id}`');
    expect(source).not.toContain('getPrivateGalleryImagesForVerifiedProject');
    expect(source).not.toContain('getWeddingReadinessForRequest');
    expect(source).not.toContain('getWeddingReadinessForVerifiedProject');
    expect(source).not.toContain('getInvitationEditorForCurrentUser');
    expect(source).not.toContain('createServerSupabaseClient');
    expect(source).not.toContain('cookies(');
    expect(source).not.toContain('headers(');
  });
});
