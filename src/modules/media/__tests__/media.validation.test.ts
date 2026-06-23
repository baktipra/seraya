import { describe, expect, it } from 'vitest';

import { detectGalleryImageMimeType, validateGalleryImageBytes } from '../media.validation';

const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const webpBytes = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38,
]);

describe('gallery media binary validation', () => {
  it.each([
    ['image/jpeg', jpegBytes],
    ['image/png', pngBytes],
    ['image/webp', webpBytes],
  ] as const)('accepts %s magic bytes', (mimeType, bytes) => {
    expect(detectGalleryImageMimeType(bytes)).toBe(mimeType);
    expect(
      validateGalleryImageBytes({
        bytes,
        declaredMimeType: mimeType,
        declaredSizeBytes: bytes.byteLength,
      }),
    ).toBe(mimeType);
  });

  it('rejects HTML, SVG, unknown payloads, mismatched MIME, and oversized input', () => {
    const html = new TextEncoder().encode('<html><script>alert(1)</script></html>');
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>');

    expect(() =>
      validateGalleryImageBytes({
        bytes: html,
        declaredMimeType: 'image/jpeg',
        declaredSizeBytes: html.byteLength,
      }),
    ).toThrow(/JPEG, PNG, atau WebP/i);

    expect(() =>
      validateGalleryImageBytes({
        bytes: svg,
        declaredMimeType: 'image/png',
        declaredSizeBytes: svg.byteLength,
      }),
    ).toThrow(/JPEG, PNG, atau WebP/i);

    expect(() =>
      validateGalleryImageBytes({
        bytes: jpegBytes,
        declaredMimeType: 'image/png',
        declaredSizeBytes: jpegBytes.byteLength,
      }),
    ).toThrow(/tidak cocok/i);

    expect(() =>
      validateGalleryImageBytes({
        bytes: jpegBytes,
        declaredMimeType: 'image/jpeg',
        declaredSizeBytes: jpegBytes.byteLength + 1,
      }),
    ).toThrow(/Ukuran foto tidak cocok/i);

    const oversized = new Uint8Array(10_485_761);
    oversized.set(jpegBytes);
    expect(() =>
      validateGalleryImageBytes({
        bytes: oversized,
        declaredMimeType: 'image/jpeg',
        declaredSizeBytes: oversized.byteLength,
      }),
    ).toThrow(/maksimal 10 MB/i);
  });
});
