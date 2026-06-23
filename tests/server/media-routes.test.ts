import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  AuthenticationRequiredErrorMock,
  MediaAccessDeniedErrorMock,
  MediaAssetUnavailableErrorMock,
  PublicMediaRepositoryErrorMock,
  downloadMock,
  getOwnedMock,
  getPublicMock,
} = vi.hoisted(() => ({
  AuthenticationRequiredErrorMock: class AuthenticationRequiredError extends Error {},
  MediaAccessDeniedErrorMock: class MediaAccessDeniedError extends Error {},
  MediaAssetUnavailableErrorMock: class MediaAssetUnavailableError extends Error {},
  PublicMediaRepositoryErrorMock: class PublicMediaRepositoryError extends Error {},
  downloadMock: vi.fn(),
  getOwnedMock: vi.fn(),
  getPublicMock: vi.fn(),
}));

vi.mock('@/modules/auth/current-user', () => ({
  AuthenticationRequiredError: AuthenticationRequiredErrorMock,
}));

vi.mock('@/modules/media/media.service', () => ({
  MediaAccessDeniedError: MediaAccessDeniedErrorMock,
  getOwnedMediaBinaryForCurrentUser: getOwnedMock,
}));

vi.mock('@/modules/media/media.repository', () => ({
  MediaAssetUnavailableError: MediaAssetUnavailableErrorMock,
  downloadMediaAssetBytes: downloadMock,
}));

vi.mock('@/modules/media/public-media.service', () => ({
  getPublicPublishedMediaBinary: getPublicMock,
}));

vi.mock('@/modules/media/public-media.repository', () => ({
  PublicMediaRepositoryError: PublicMediaRepositoryErrorMock,
}));

import { GET as getPrivateMedia } from '@/app/(dashboard)/dashboard/media/[assetId]/route';
import {
  GET as getPublicMedia,
  dynamic as publicMediaDynamic,
  revalidate as publicMediaRevalidate,
} from '@/app/media/[assetId]/route';

const asset = {
  created_at: '2026-06-20T00:00:00.000Z',
  deleted_at: null,
  id: '11111111-1111-4111-8111-111111111111',
  media_kind: 'gallery_image' as const,
  mime_type: 'image/png' as const,
  project_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  size_bytes: 12,
  status: 'ready' as const,
  storage_bucket: 'invitation-media' as const,
  storage_path: 'projects/private/gallery/secret.png',
  updated_at: '2026-06-20T00:00:00.000Z',
};

describe('SRY-009 private/public media proxy routes', () => {
  beforeEach(() => {
    downloadMock.mockReset();
    getOwnedMock.mockReset();
    getPublicMock.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('serves ready owner media privately and blocks anonymous or foreign availability', async () => {
    getOwnedMock.mockResolvedValue(asset);
    downloadMock.mockResolvedValue(new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])]));

    const response = await getPrivateMedia(
      new Request(`http://localhost/dashboard/media/${asset.id}`),
      {
        params: Promise.resolve({ assetId: asset.id }),
      },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toContain('private');
    expect(response.headers.get('Cache-Control')).toContain('no-store');
    expect(response.headers.get('Content-Type')).toBe('image/png');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(response.headers.get('Content-Disposition')).toBe('inline');

    getOwnedMock.mockRejectedValue(new AuthenticationRequiredErrorMock());
    await expect(
      getPrivateMedia(new Request(`http://localhost/dashboard/media/${asset.id}`), {
        params: Promise.resolve({ assetId: asset.id }),
      }),
    ).resolves.toMatchObject({ status: 401 });

    getOwnedMock.mockRejectedValue(new MediaAccessDeniedErrorMock());
    await expect(
      getPrivateMedia(new Request(`http://localhost/dashboard/media/${asset.id}`), {
        params: Promise.resolve({ assetId: asset.id }),
      }),
    ).resolves.toMatchObject({ status: 404 });
  });

  it.each(['draft-only', 'historical-only', 'unknown', 'foreign-project', 'failed', 'deleted'])(
    'returns public 404 for %s media availability',
    async () => {
      getPublicMock.mockResolvedValue(null);

      await expect(
        getPublicMedia(new Request(`http://localhost/media/${asset.id}`), {
          params: Promise.resolve({ assetId: asset.id }),
        }),
      ).resolves.toMatchObject({ status: 404 });
    },
  );

  it('serves only current published media with public cache and content headers', async () => {
    expect(publicMediaDynamic).toBe('force-static');
    expect(publicMediaRevalidate).toBe(3600);

    getPublicMock.mockResolvedValue({
      asset,
      bytes: new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])]),
    });
    const response = await getPublicMedia(new Request(`http://localhost/media/${asset.id}`), {
      params: Promise.resolve({ assetId: asset.id }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toContain('s-maxage=3600');
    expect(response.headers.get('Cache-Control')).not.toContain('private');
    expect(response.headers.get('Cache-Control')).not.toContain('no-store');
    expect(response.headers.get('Content-Type')).toBe('image/png');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(response.headers.get('Content-Disposition')).toBe('inline');

    getPublicMock.mockRejectedValue(new MediaAssetUnavailableErrorMock());
    await expect(
      getPublicMedia(new Request(`http://localhost/media/${asset.id}`), {
        params: Promise.resolve({ assetId: asset.id }),
      }),
    ).resolves.toMatchObject({ status: 404 });
  });

  it('keeps public media route free of cookie/session/dashboard and direct storage URL output', async () => {
    const testDirectory = path.dirname(fileURLToPath(import.meta.url));
    const source = await readFile(
      path.resolve(testDirectory, '../../src/app/media/[assetId]/route.ts'),
      'utf8',
    );

    expect(source).toContain("export const dynamic = 'force-static';");
    expect(source).toContain('export const revalidate = 3600;');
    expect(source).not.toContain('cookies(');
    expect(source).not.toContain('createServerSupabaseClient');
    expect(source).not.toContain('invitation_drafts');
    expect(source).not.toContain('storage_path');
  });
});
