import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { createDefaultInvitationDraftContent } from '@/modules/invitations/invitation-draft.defaults';
import { invitationDraftContentSchema } from '@/modules/invitations/invitation-draft.schema';
import {
  MAX_INVITATION_AUDIO_BYTES,
  MAX_INVITATION_AUDIO_DURATION_SECONDS,
} from '@/modules/media/invitation-audio.types';
import {
  invitationAudioReservationSchema,
  validateInvitationAudioBytes,
} from '@/modules/media/invitation-audio.validation';

const project = {
  default_timezone: 'Asia/Jakarta',
  event_date_primary: '2027-05-12',
  person_one_name: 'Raka',
  person_two_name: 'Nadia',
};

describe('V4J Slice B invitation audio media foundation', () => {
  it('keeps legacy drafts compatible with a disabled audio default', () => {
    const content = createDefaultInvitationDraftContent(project);
    const legacy = { ...content } as Record<string, unknown>;
    delete legacy.audio;

    const parsed = invitationDraftContentSchema.parse(legacy);
    expect(parsed.audio).toEqual({
      assetId: null,
      durationSeconds: null,
      originalFileName: null,
      rightsAcknowledged: false,
    });
  });

  it('requires coherent asset metadata and rights acknowledgement', () => {
    const content = createDefaultInvitationDraftContent(project);
    expect(() =>
      invitationDraftContentSchema.parse({
        ...content,
        audio: {
          assetId: 'a9f7f69e-4d6f-44d3-a84a-3526f203ebcf',
          durationSeconds: 120,
          originalFileName: 'lagu.mp3',
          rightsAcknowledged: false,
        },
      }),
    ).toThrow(/hak penggunaan/i);
  });

  it('accepts only bounded MP3 and M4A reservations', () => {
    expect(
      invitationAudioReservationSchema.parse({
        mimeType: 'audio/mpeg',
        originalFileName: 'lagu-kami.mp3',
        rightsAcknowledged: true,
        sizeBytes: MAX_INVITATION_AUDIO_BYTES,
      }),
    ).toMatchObject({ mimeType: 'audio/mpeg' });

    expect(() =>
      invitationAudioReservationSchema.parse({
        mimeType: 'audio/ogg',
        originalFileName: 'lagu.ogg',
        rightsAcknowledged: true,
        sizeBytes: 100,
      }),
    ).toThrow();
  });

  it('checks file signatures, exact size, and the ten-minute duration cap', () => {
    const bytes = new Uint8Array([0x49, 0x44, 0x33, 0, 0, 0, 0, 0]);
    expect(
      validateInvitationAudioBytes({
        bytes,
        declaredMimeType: 'audio/mpeg',
        declaredSizeBytes: bytes.byteLength,
        durationSeconds: MAX_INVITATION_AUDIO_DURATION_SECONDS,
      }),
    ).toEqual({ durationSeconds: 600, mimeType: 'audio/mpeg' });

    expect(() =>
      validateInvitationAudioBytes({
        bytes,
        declaredMimeType: 'audio/mpeg',
        declaredSizeBytes: bytes.byteLength,
        durationSeconds: 601,
      }),
    ).toThrow(/10 menit/i);
  });

  it('keeps upload, finalize, remove, and publication boundaries private and explicit', () => {
    const migration = readFileSync(
      'supabase/migrations/20260805002300_m0023_add_invitation_audio_media_foundation.sql',
      'utf8',
    );
    const manager = readFileSync('src/components/projects/invitation-audio-manager.tsx', 'utf8');
    const service = readFileSync('src/modules/media/invitation-audio.service.ts', 'utf8');

    expect(migration).toContain("media_kind in ('gallery_image', 'invitation_audio')");
    expect(migration).toContain('finalize_invitation_audio_media_asset');
    expect(migration).toContain('remove_invitation_audio_media_asset');
    expect(migration).toContain('validate_invitation_draft_gallery_media');
    expect(manager).toContain('Seraya tidak menerima URL audio eksternal');
    expect(service).toContain('parseBuffer');
    expect(service).toContain('assertInvitationAudioReadyForVerifiedProject');
  });
});
