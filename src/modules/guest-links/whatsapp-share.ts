const WHATSAPP_COMPOSE_URL = 'https://wa.me/';

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

/**
 * Builds a manual WhatsApp compose handoff only. This helper deliberately
 * receives the fresh one-time URL from the existing server-controlled link
 * creation result; it does not read environment values or request metadata.
 */
export function buildWhatsAppGuestInviteShareUrl(input: {
  guestDisplayName: string;
  personalGuestUrl: string;
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

  return `${WHATSAPP_COMPOSE_URL}?text=${encodeURIComponent(message)}`;
}
