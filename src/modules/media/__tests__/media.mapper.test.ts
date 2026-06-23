import { describe, expect, it } from 'vitest';

import {
  mapPrivateGalleryAssetsToInvitationImages,
  mapPublishedGalleryIdsToInvitationImages,
} from '../media.mapper';

const firstId = '11111111-1111-4111-8111-111111111111';
const secondId = '22222222-2222-4222-8222-222222222222';

describe('gallery render-safe mappers', () => {
  it('maps only ready owner-visible assets in draft order without exposing Storage details', () => {
    const images = mapPrivateGalleryAssetsToInvitationImages(
      [secondId, firstId, '33333333-3333-4333-8333-333333333333'],
      [
        {
          created_at: '2026-06-20T00:00:00.000Z',
          deleted_at: null,
          id: firstId,
          media_kind: 'gallery_image',
          mime_type: 'image/jpeg',
          project_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          size_bytes: 12,
          status: 'ready',
          storage_bucket: 'invitation-media',
          storage_path: 'projects/private/gallery/private.jpg',
          updated_at: '2026-06-20T00:00:00.000Z',
        },
        {
          created_at: '2026-06-20T00:00:00.000Z',
          deleted_at: null,
          id: secondId,
          media_kind: 'gallery_image',
          mime_type: 'image/png',
          project_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          size_bytes: 12,
          status: 'failed',
          storage_bucket: 'invitation-media',
          storage_path: 'projects/private/gallery/failed.png',
          updated_at: '2026-06-20T00:00:00.000Z',
        },
      ],
    );

    expect(images).toEqual([
      { alt: 'Foto pasangan 2', id: firstId, src: `/dashboard/media/${firstId}` },
    ]);
    expect(JSON.stringify(images)).not.toContain('projects/private');
  });

  it('maps only UUID snapshot IDs to public media proxy paths', () => {
    expect(mapPublishedGalleryIdsToInvitationImages([firstId, 'not-an-asset-id'])).toEqual([
      { alt: 'Foto pasangan 1', id: firstId, src: `/media/${firstId}` },
    ]);
  });
});
