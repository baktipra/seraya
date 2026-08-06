import { describe, expect, it } from 'vitest';

import { getInvitationStudioMediaSummary } from '../../src/components/projects/invitation-studio-media-mode';
import { createDefaultInvitationDraftContent } from '../../src/modules/invitations/invitation-draft.defaults';
import {
  createInvitationEditorSubmissionPayload,
  invitationEditorLocalContentReducer,
} from '../../src/modules/invitations/invitation-editor-local-state';
import { galleryMediaOrderSchema } from '../../src/modules/media/media.validation';

const firstImageId = '11111111-1111-4111-8111-111111111111';
const secondImageId = '22222222-2222-4222-8222-222222222222';
const audioId = '33333333-3333-4333-8333-333333333333';

function createContent() {
  return createDefaultInvitationDraftContent({
    default_timezone: 'Asia/Jakarta',
    event_date_primary: '2027-06-12',
    person_one_name: 'Nadia',
    person_two_name: 'Raka',
  });
}

describe('Invitation Studio Slice D Media Mode', () => {
  it('accepts only unique gallery orders inside the twelve-image contract', () => {
    expect(galleryMediaOrderSchema.parse([firstImageId, secondImageId])).toEqual([
      firstImageId,
      secondImageId,
    ]);
    expect(galleryMediaOrderSchema.safeParse([firstImageId, firstImageId]).success).toBe(false);
    expect(
      galleryMediaOrderSchema.safeParse(
        Array.from(
          { length: 13 },
          (_, index) => `${String(index + 1).padStart(8, '0')}-1111-4111-8111-111111111111`,
        ),
      ).success,
    ).toBe(false);
  });

  it('synchronizes gallery membership and audio without changing composition visibility', () => {
    const initial = createContent();
    const withGallery = invitationEditorLocalContentReducer(initial, {
      imageIds: [firstImageId, secondImageId],
      type: 'gallery-assets',
    });
    const withAudio = invitationEditorLocalContentReducer(withGallery, {
      audio: {
        assetId: audioId,
        durationSeconds: 185,
        originalFileName: 'lagu-kita.mp3',
        rightsAcknowledged: true,
      },
      type: 'audio-asset',
    });

    expect(withGallery.gallery.imageIds).toEqual([firstImageId, secondImageId]);
    expect(withGallery.gallery.enabled).toBe(initial.gallery.enabled);
    expect(withAudio.audio.assetId).toBe(audioId);
    expect(initial.gallery.imageIds).toEqual([]);
  });

  it('submits gallery visibility through Studio Save without trusting browser media IDs', () => {
    const hidden = invitationEditorLocalContentReducer(createContent(), {
      enabled: false,
      type: 'gallery-visibility',
    });
    const payload = createInvitationEditorSubmissionPayload(hidden);

    expect(payload.gallery).toEqual({ enabled: false });
    expect(payload.gallery).not.toHaveProperty('imageIds');
    expect(payload).not.toHaveProperty('audio');
  });

  it('presents truthful gallery and audio summaries', () => {
    expect(getInvitationStudioMediaSummary({ audio: null, images: [] })).toEqual({
      audioLabel: 'Belum ada audio',
      galleryLabel: 'Belum ada foto',
    });
    expect(
      getInvitationStudioMediaSummary({
        audio: {
          durationSeconds: 185,
          id: audioId,
          mimeType: 'audio/mpeg',
          originalFileName: 'lagu-kita.mp3',
          sizeBytes: 2_097_152,
        },
        images: [
          { alt: 'Foto pertama', id: firstImageId, src: '/media/first' },
          { alt: 'Foto kedua', id: secondImageId, src: '/media/second' },
        ],
      }),
    ).toEqual({ audioLabel: 'Audio siap', galleryLabel: '2 foto aktif' });
  });
});
