import { z } from 'zod';

import {
  MAX_INVITATION_AUDIO_BYTES,
  MAX_INVITATION_AUDIO_DURATION_SECONDS,
  SUPPORTED_INVITATION_AUDIO_MIME_TYPES,
  type InvitationAudioMimeType,
} from './invitation-audio.types';

const databaseUuidShape = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fileNamePattern = /^[^\\/\u0000-\u001f]+$/;

export class InvitationAudioValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvitationAudioValidationError';
  }
}

export const invitationAudioReservationSchema = z
  .object({
    mimeType: z.enum(SUPPORTED_INVITATION_AUDIO_MIME_TYPES),
    originalFileName: z
      .string()
      .trim()
      .min(1, 'Nama file audio tidak valid.')
      .max(180, 'Nama file audio maksimal 180 karakter.')
      .regex(fileNamePattern, 'Nama file audio tidak valid.'),
    rightsAcknowledged: z.literal(true, {
      error: 'Konfirmasikan bahwa Anda berhak menggunakan audio ini.',
    }),
    sizeBytes: z
      .number()
      .int()
      .positive('File audio tidak boleh kosong.')
      .max(MAX_INVITATION_AUDIO_BYTES, 'Ukuran audio maksimal 15 MB.'),
  })
  .strict()
  .superRefine((value, context) => {
    const lowerName = value.originalFileName.toLowerCase();
    const extensionMatches =
      (value.mimeType === 'audio/mpeg' && lowerName.endsWith('.mp3')) ||
      (value.mimeType !== 'audio/mpeg' && lowerName.endsWith('.m4a'));

    if (!extensionMatches) {
      context.addIssue({
        code: 'custom',
        message: 'Gunakan file MP3 atau M4A yang sesuai dengan formatnya.',
        path: ['originalFileName'],
      });
    }
  });

export const invitationAudioAssetActionSchema = z
  .object({
    assetId: z.string().regex(databaseUuidShape, 'Audio tidak valid.'),
  })
  .strict();

export function getInvitationAudioExtension(mimeType: InvitationAudioMimeType) {
  return mimeType === 'audio/mpeg' ? 'mp3' : 'm4a';
}

function hasMp3Signature(bytes: Uint8Array) {
  if (bytes.length < 3) {
    return false;
  }

  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    return true;
  }

  return bytes[0] === 0xff && ((bytes[1] ?? 0) & 0xe0) === 0xe0;
}

function hasM4aSignature(bytes: Uint8Array) {
  if (bytes.length < 12) {
    return false;
  }

  return String.fromCharCode(...bytes.slice(4, 8)) === 'ftyp';
}

export function validateInvitationAudioBytes(input: {
  bytes: Uint8Array;
  declaredMimeType: string;
  declaredSizeBytes: number;
  durationSeconds: number | undefined;
}): { durationSeconds: number; mimeType: InvitationAudioMimeType } {
  if (
    input.bytes.byteLength <= 0 ||
    input.bytes.byteLength > MAX_INVITATION_AUDIO_BYTES ||
    input.bytes.byteLength !== input.declaredSizeBytes
  ) {
    throw new InvitationAudioValidationError(
      'Ukuran audio tidak sesuai dengan file yang disiapkan.',
    );
  }

  const isMp3 = hasMp3Signature(input.bytes);
  const isM4a = hasM4aSignature(input.bytes);
  const declaredIsMp3 = input.declaredMimeType === 'audio/mpeg';
  const declaredIsM4a =
    input.declaredMimeType === 'audio/mp4' || input.declaredMimeType === 'audio/x-m4a';

  if ((declaredIsMp3 && !isMp3) || (declaredIsM4a && !isM4a) || (!isMp3 && !isM4a)) {
    throw new InvitationAudioValidationError('Isi file tidak sesuai dengan format MP3 atau M4A.');
  }

  const duration = input.durationSeconds;

  if (
    typeof duration !== 'number' ||
    !Number.isFinite(duration) ||
    duration <= 0 ||
    duration > MAX_INVITATION_AUDIO_DURATION_SECONDS
  ) {
    throw new InvitationAudioValidationError('Durasi audio maksimal 10 menit.');
  }

  return {
    durationSeconds: Math.max(1, Math.round(duration)),
    mimeType: isMp3 ? 'audio/mpeg' : 'audio/mp4',
  };
}
