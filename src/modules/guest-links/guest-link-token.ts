import 'server-only';

import { createHash, randomBytes } from 'node:crypto';

/** 32 bytes = 256 bits. Node's base64url output is opaque and URL-safe. */
export const PERSONAL_GUEST_TOKEN_BYTES = 32;
export const PERSONAL_GUEST_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43,128}$/;
export const PERSONAL_GUEST_TOKEN_HASH_PATTERN = /^[0-9a-f]{64}$/;

export function generatePersonalGuestToken() {
  return randomBytes(PERSONAL_GUEST_TOKEN_BYTES).toString('base64url');
}

export function isValidPersonalGuestToken(value: string) {
  return PERSONAL_GUEST_TOKEN_PATTERN.test(value);
}

export function hashPersonalGuestToken(token: string) {
  if (!isValidPersonalGuestToken(token)) {
    throw new Error('Personal guest token has an invalid format.');
  }

  return createHash('sha256').update(token, 'utf8').digest('hex');
}
