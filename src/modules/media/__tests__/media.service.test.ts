import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultInvitationDraftContent } from '@/modules/invitations/invitation-draft.defaults';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

const {
  createSignedUploadUrlMock,
  downloadMediaBytesMock,
  finalizeWithAdminMock,
  getActiveDraftMock,
  getAssetMock,
  getOwnedProjectMock,
  markFailedMock,
  requireCurrentUserMock,
  reserveAssetMock,
} = vi.hoisted(() => ({
  createSignedUploadUrlMock: vi.fn(),
  downloadMediaBytesMock: vi.fn(),
  finalizeWithAdminMock: vi.fn(),
  getActiveDraftMock: vi.fn(),
  getAssetMock: vi.fn(),
  getOwnedProjectMock: vi.fn(),
  markFailedMock: vi.fn(),
  requireCurrentUserMock: vi.fn(),
  reserveAssetMock: vi.fn(),
}));

vi.mock('@/modules/auth/current-user', () => ({
  requireCurrentUser: requireCurrentUserMock,
}));

vi.mock('@/modules/projects/project.repository', () => ({
  getOwnedProjectById: getOwnedProjectMock,
}));

vi.mock('@/modules/invitations/invitation-draft.repository', () => ({
  getActiveInvitationDraftForVerifiedProject: getActiveDraftMock,
}));

vi.mock('../media.repository', () => ({
  createSignedMediaUploadUrl: createSignedUploadUrlMock,
  downloadMediaAssetBytes: downloadMediaBytesMock,
  finalizeGalleryMediaAssetWithAdmin: finalizeWithAdminMock,
  getMediaAssetForVerifiedProjectWithAdmin: getAssetMock,
  getOwnedReadyMediaAssetById: vi.fn(),
  getReadyMediaAssetsForVerifiedProject: vi.fn(),
  markMediaAssetFailedForVerifiedProject: markFailedMock,
  reserveProcessingGalleryMediaAsset: reserveAssetMock,
  updateInvitationDraftGalleryForVerifiedProject: vi.fn(),
}));

import {
  finalizeGalleryUploadForCurrentUser,
  reserveGalleryUploadForCurrentUser,
} from '../media.service';
import { GalleryMediaValidationError } from '../media.validation';

const userA = '11111111-1111-1111-1111-111111111111';
const userB = '22222222-2222-4222-8222-222222222222';
const project = {
  account_id: userA,
  default_timezone: 'Asia/Jakarta',
  deleted_at: null,
  event_city: 'Jakarta',
  event_date_primary: '2027-08-17',
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  person_one_name: 'Raka',
  person_two_name: 'Nadia',
  slug: 'raka-nadia',
  status: 'draft',
};
const assetId = '33333333-3333-4333-8333-333333333333';

function createDraft(imageIds: string[] = []) {
  const content = createDefaultInvitationDraftContent(project);
  content.gallery = { enabled: imageIds.length > 0, imageIds };

  return {
    content,
    created_at: '2026-06-20T00:00:00.000Z',
    deleted_at: null,
    id: 'draft-id',
    project_id: project.id,
    schema_version: 1,
    updated_at: '2026-06-20T00:00:00.000Z',
  };
}

function createProcessingAsset() {
  return {
    created_at: '2026-06-20T00:00:00.000Z',
    deleted_at: null,
    id: assetId,
    media_kind: 'gallery_image' as const,
    mime_type: 'image/png' as const,
    project_id: project.id,
    size_bytes: 9,
    status: 'processing' as const,
    storage_bucket: 'invitation-media' as const,
    storage_path: `projects/${project.id}/gallery/${assetId}.png`,
    updated_at: '2026-06-20T00:00:00.000Z',
  };
}

describe('SRY-009 gallery media server service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireCurrentUserMock.mockResolvedValue({ id: userA });
    getOwnedProjectMock.mockResolvedValue(project);
    getActiveDraftMock.mockResolvedValue(createDraft());
    reserveAssetMock.mockResolvedValue(createProcessingAsset());
    createSignedUploadUrlMock.mockResolvedValue('https://upload.example.test/temporary-token');
    getAssetMock.mockResolvedValue(createProcessingAsset());
    markFailedMock.mockResolvedValue(undefined);
    finalizeWithAdminMock.mockResolvedValue(undefined);
  });

  it('rejects a User B reservation attempt for User A project before a media row or signed URL is created', async () => {
    requireCurrentUserMock.mockResolvedValue({ id: userB });
    getOwnedProjectMock.mockRejectedValue(new ProjectAccessDeniedError());

    await expect(
      reserveGalleryUploadForCurrentUser({
        projectId: project.id,
        upload: { mimeType: 'image/jpeg', sizeBytes: 12 },
      }),
    ).rejects.toBeInstanceOf(ProjectAccessDeniedError);

    expect(reserveAssetMock).not.toHaveBeenCalled();
    expect(createSignedUploadUrlMock).not.toHaveBeenCalled();
  });

  it('generates an opaque server-owned path without accepting or retaining an original filename', async () => {
    const reservation = await reserveGalleryUploadForCurrentUser({
      projectId: project.id,
      upload: { mimeType: 'image/jpeg', sizeBytes: 12 },
    });

    expect(reservation).toEqual({
      assetId,
      signedUploadUrl: 'https://upload.example.test/temporary-token',
    });
    expect(reserveAssetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mimeType: 'image/jpeg',
        project,
        sizeBytes: 12,
        storagePath: expect.stringMatching(
          new RegExp(`^projects/${project.id}/gallery/[0-9a-f-]{36}\\.jpg$`),
        ),
      }),
    );

    const storagePath = reserveAssetMock.mock.calls[0]?.[0]?.storagePath as string;
    expect(storagePath).not.toContain('foto-kami');
    expect(storagePath).not.toContain('raka-nadia');
  });

  it('validates downloaded bytes, finalizes exactly once, and maps only a private Seraya proxy URL', async () => {
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    downloadMediaBytesMock.mockResolvedValue(new Blob([pngBytes]));

    await expect(
      finalizeGalleryUploadForCurrentUser({ assetId, projectId: project.id }),
    ).resolves.toEqual({
      alt: 'Foto pasangan 1',
      id: assetId,
      src: `/dashboard/media/${assetId}`,
    });

    expect(finalizeWithAdminMock).toHaveBeenCalledWith({
      assetId,
      mimeType: 'image/png',
      sizeBytes: pngBytes.byteLength,
    });
    expect(markFailedMock).not.toHaveBeenCalled();
  });

  it('marks a reserved asset failed and keeps it unattached when Storage bytes are not a supported image', async () => {
    const htmlBytes = new TextEncoder().encode('<html>not-an-image</html>');
    downloadMediaBytesMock.mockResolvedValue(new Blob([htmlBytes]));

    await expect(
      finalizeGalleryUploadForCurrentUser({ assetId, projectId: project.id }),
    ).rejects.toBeInstanceOf(GalleryMediaValidationError);

    expect(finalizeWithAdminMock).not.toHaveBeenCalled();
    expect(markFailedMock).toHaveBeenCalledWith(project, assetId);
  });
});
