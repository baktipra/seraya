const WHATSAPP_COMPOSE_ORIGIN = 'https://wa.me';
const canonicalE164Pattern = /^\+[1-9][0-9]{7,14}$/;

function normalizeGuestDisplayName(value: string) {
  return value.trim().replace(/\s+/gu, ' ');
}

function assertHttpsPersonalGuestUrl(value: string) {
  if (value !== value.trim()) {
    throw new Error('Personal guest invitation URL must be a valid HTTPS URL.');
  }

  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    throw new Error('Personal guest invitation URL must be a valid HTTPS URL.');
  }

  if (
    parsed.protocol !== 'https:' ||
    !parsed.hostname ||
    parsed.username.length > 0 ||
    parsed.password.length > 0
  ) {
    throw new Error('Personal guest invitation URL must be a valid HTTPS URL.');
  }
}

function assertCanonicalRecipientWhatsAppPhone(value: string) {
  if (!canonicalE164Pattern.test(value)) {
    throw new Error('Recipient WhatsApp phone must be a canonical E.164 value.');
  }
}

function buildWhatsAppComposeUrl(input: {
  message: string;
  recipientWhatsAppPhoneE164?: string | null;
}) {
  const encodedMessage = encodeURIComponent(input.message);
  const recipientWhatsAppPhoneE164 = input.recipientWhatsAppPhoneE164 ?? null;

  if (!recipientWhatsAppPhoneE164) {
    return `${WHATSAPP_COMPOSE_ORIGIN}/?text=${encodedMessage}`;
  }

  assertCanonicalRecipientWhatsAppPhone(recipientWhatsAppPhoneE164);
  return `${WHATSAPP_COMPOSE_ORIGIN}/${recipientWhatsAppPhoneE164.slice(1)}?text=${encodedMessage}`;
}

/**
 * Builds a manual WhatsApp compose handoff only. The fresh capability URL and
 * optional recipient phone arrive from the already-authorized one-time result;
 * this helper never reads request metadata, environment values, or storage.
 */
export function buildWhatsAppGuestInviteShareUrl(input: {
  guestDisplayName: string;
  personalGuestUrl: string;
  recipientWhatsAppPhoneE164?: string | null;
}) {
  const guestDisplayName = normalizeGuestDisplayName(input.guestDisplayName);

  if (!guestDisplayName) {
    throw new Error('Guest display name is required for WhatsApp sharing.');
  }

  assertHttpsPersonalGuestUrl(input.personalGuestUrl);

  const message = [
    `Halo ${guestDisplayName},`,
    '',
    'Kami mengundang Anda untuk hadir di acara pernikahan kami.',
    '',
    input.personalGuestUrl,
  ].join('\n');

  return buildWhatsAppComposeUrl({
    message,
    recipientWhatsAppPhoneE164: input.recipientWhatsAppPhoneE164,
  });
}
