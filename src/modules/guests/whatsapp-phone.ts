const canonicalE164Pattern = /^\+[1-9][0-9]{7,14}$/;
const canonicalIndonesianWhatsAppPattern = /^\+628[0-9]+$/;

export class GuestWhatsAppPhoneValidationError extends Error {
  constructor() {
    super('Nomor WhatsApp perlu menggunakan format yang valid.');
    this.name = 'GuestWhatsAppPhoneValidationError';
  }
}

function removeAllowedFormatting(value: string) {
  return value.replace(/[\s()-]/gu, '');
}

function assertCanonicalE164(value: string) {
  if (!canonicalE164Pattern.test(value)) {
    throw new GuestWhatsAppPhoneValidationError();
  }
}

function assertCanonicalIndonesianWhatsApp(value: string) {
  if (!canonicalIndonesianWhatsAppPattern.test(value)) {
    throw new GuestWhatsAppPhoneValidationError();
  }
}

/**
 * Normalizes only the supported Indonesian local/country-prefix inputs. Other
 * countries must already arrive as canonical +E.164 so no country code is ever
 * guessed on the owner's behalf.
 */
export function normalizeGuestWhatsAppPhoneE164(value: string): string | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const compact = removeAllowedFormatting(trimmed);

  if (!compact || compact.startsWith('00')) {
    throw new GuestWhatsAppPhoneValidationError();
  }

  if (compact.startsWith('+')) {
    assertCanonicalE164(compact);

    if (compact.startsWith('+62')) {
      assertCanonicalIndonesianWhatsApp(compact);
    }

    return compact;
  }

  if (!/^\d+$/u.test(compact)) {
    throw new GuestWhatsAppPhoneValidationError();
  }

  if (compact.startsWith('08')) {
    const canonical = `+62${compact.slice(1)}`;
    assertCanonicalE164(canonical);
    assertCanonicalIndonesianWhatsApp(canonical);
    return canonical;
  }

  if (compact.startsWith('62')) {
    const canonical = `+${compact}`;
    assertCanonicalE164(canonical);
    assertCanonicalIndonesianWhatsApp(canonical);
    return canonical;
  }

  throw new GuestWhatsAppPhoneValidationError();
}

export function isCanonicalGuestWhatsAppPhoneE164(value: string | null | undefined) {
  return Boolean(value && canonicalE164Pattern.test(value));
}
