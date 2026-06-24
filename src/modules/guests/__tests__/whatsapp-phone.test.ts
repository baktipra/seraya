import { describe, expect, it } from 'vitest';

import {
  GuestWhatsAppPhoneValidationError,
  isCanonicalGuestWhatsAppPhoneE164,
  normalizeGuestWhatsAppPhoneE164,
} from '../whatsapp-phone';

describe('SRY-022 private guest WhatsApp phone normalization', () => {
  it.each([
    ['blank', '   ', null],
    ['Indonesian local mobile', '0812 3456 7890', '+6281234567890'],
    ['Indonesian country prefix', '62-812-3456-7890', '+6281234567890'],
    ['canonical Indonesian E.164', '+62 (812) 3456-7890', '+6281234567890'],
    ['canonical international E.164', '+1 (415) 555-0123', '+14155550123'],
  ])('normalizes %s without guessing a foreign country code', (_label, source, expected) => {
    expect(normalizeGuestWhatsAppPhoneE164(source)).toBe(expected);
  });

  it.each([
    '0014155550123',
    '14155550123',
    '+0 812 3456 7890',
    '+62081234567890',
    '+621234567890',
    '07123456789',
    '0812abc7890',
    '+62++81234567890',
    '+6281234',
    '+628123456789012345',
    '0812 ext 99',
  ])('rejects malformed, unsupported, or noncanonical input safely: %s', (source) => {
    expect(() => normalizeGuestWhatsAppPhoneE164(source)).toThrow(
      GuestWhatsAppPhoneValidationError,
    );
  });

  it('recognizes only canonical E.164 values as recipient targets', () => {
    expect(isCanonicalGuestWhatsAppPhoneE164('+6281234567890')).toBe(true);
    expect(isCanonicalGuestWhatsAppPhoneE164('081234567890')).toBe(false);
    expect(isCanonicalGuestWhatsAppPhoneE164(null)).toBe(false);
  });
});
