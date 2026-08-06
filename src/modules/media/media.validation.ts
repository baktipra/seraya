import { z } from 'zod';

import {
  MAX_GALLERY_IMAGE_BYTES,
  MAX_GALLERY_IMAGES,
  SUPPORTED_GALLERY_IMAGE_MIME_TYPES,
  type GalleryImageMimeType,
} from './media.types';

export const galleryMediaReservationSchema = z
  .object({
    mimeType: z.enum(SUPPORTED_GALLERY_IMAGE_MIME_TYPES, {
      error: 'Pilih file JPEG, PNG, atau WebP.',
    }),
    sizeBytes: z
      .number()
      .int('Ukuran file tidak valid.')
      .positive('Ukuran file tidak valid.')
      .max(MAX_GALLERY_IMAGE_BYTES, 'Ukuran foto maksimal 10 MB.'),
  })
  .strict();

export const galleryMediaAssetIdSchema = z.string().uuid('Foto tidak valid.');

export const galleryMediaOrderSchema = z
  .array(galleryMediaAssetIdSchema)
  .max(MAX_GALLERY_IMAGES, `Galeri undangan maksimal berisi ${MAX_GALLERY_IMAGES} foto.`)
  .refine((imageIds) => new Set(imageIds).size === imageIds.length, 'Urutan foto tidak valid.');

export class GalleryMediaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GalleryMediaValidationError';
  }
}

export function isSupportedGalleryImageMimeType(value: string): value is GalleryImageMimeType {
  return (SUPPORTED_GALLERY_IMAGE_MIME_TYPES as readonly string[]).includes(value);
}

export function getGalleryImageExtension(mimeType: GalleryImageMimeType) {
  switch (mimeType) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
  }
}

function isJpeg(bytes: Uint8Array) {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

function isPng(bytes: Uint8Array) {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  return signature.every((value, index) => bytes[index] === value);
}

function isWebp(bytes: Uint8Array) {
  return (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  );
}

/** Detects only the formats supported by the private invitation gallery. */
export function detectGalleryImageMimeType(bytes: Uint8Array): GalleryImageMimeType | null {
  if (isJpeg(bytes)) {
    return 'image/jpeg';
  }

  if (isPng(bytes)) {
    return 'image/png';
  }

  if (isWebp(bytes)) {
    return 'image/webp';
  }

  return null;
}

/**
 * Validates storage bytes after upload. Browser MIME is preliminary only: the
 * actual binary must be a supported image, match the declared type, and remain
 * inside the exact 10 MB contract.
 */
export function validateGalleryImageBytes(input: {
  bytes: Uint8Array;
  declaredMimeType: GalleryImageMimeType;
  declaredSizeBytes: number;
}): GalleryImageMimeType {
  const { bytes, declaredMimeType, declaredSizeBytes } = input;

  if (bytes.byteLength <= 0 || bytes.byteLength > MAX_GALLERY_IMAGE_BYTES) {
    throw new GalleryMediaValidationError('Ukuran foto maksimal 10 MB.');
  }

  if (bytes.byteLength !== declaredSizeBytes) {
    throw new GalleryMediaValidationError('Ukuran foto tidak cocok dengan file yang diunggah.');
  }

  const detectedMimeType = detectGalleryImageMimeType(bytes);

  if (!detectedMimeType) {
    throw new GalleryMediaValidationError('File bukan gambar JPEG, PNG, atau WebP yang valid.');
  }

  if (detectedMimeType !== declaredMimeType) {
    throw new GalleryMediaValidationError('Jenis file foto tidak cocok dengan isi file.');
  }

  return detectedMimeType;
}
