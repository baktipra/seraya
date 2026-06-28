import 'server-only';

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const AES_256_KEY_BYTES = 32;
const AES_GCM_IV_BYTES = 12;
const CIPHERTEXT_PARTS = 4;
const TEST_KEYRING = JSON.stringify({
  1: 'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=',
});

export class PersonalGuestLinkEncryptionError extends Error {
  constructor() {
    super('The personal guest-link encryption material is unavailable.');
    this.name = 'PersonalGuestLinkEncryptionError';
  }
}

export type EncryptedPersonalGuestToken = {
  ciphertext: string;
  keyVersion: number;
};

type Keyring = Map<number, Buffer>;

function getRequiredEnvironment(name: string) {
  const value = process.env[name];

  if (value) {
    return value;
  }

  // Vitest runs in a non-deployable environment. Production and local runtime
  // must explicitly configure a server-only keyring before links can be made.
  if (process.env.NODE_ENV === 'test') {
    return name === 'SERAYA_GUEST_LINK_ENCRYPTION_KEYRING' ? TEST_KEYRING : '1';
  }

  throw new PersonalGuestLinkEncryptionError();
}

function parsePositiveKeyVersion(value: string) {
  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 2_147_483_647) {
    throw new PersonalGuestLinkEncryptionError();
  }

  return parsed;
}

function parseKeyring(value: string): Keyring {
  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    throw new PersonalGuestLinkEncryptionError();
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new PersonalGuestLinkEncryptionError();
  }

  const keyring: Keyring = new Map();

  for (const [versionText, encodedKey] of Object.entries(parsed)) {
    if (typeof encodedKey !== 'string') {
      throw new PersonalGuestLinkEncryptionError();
    }

    const version = parsePositiveKeyVersion(versionText);
    const key = Buffer.from(encodedKey, 'base64url');

    if (key.length !== AES_256_KEY_BYTES) {
      throw new PersonalGuestLinkEncryptionError();
    }

    keyring.set(version, key);
  }

  if (keyring.size === 0) {
    throw new PersonalGuestLinkEncryptionError();
  }

  return keyring;
}

function readKeyring() {
  return parseKeyring(getRequiredEnvironment('SERAYA_GUEST_LINK_ENCRYPTION_KEYRING'));
}

function readCurrentKeyVersion() {
  return parsePositiveKeyVersion(
    getRequiredEnvironment('SERAYA_GUEST_LINK_ENCRYPTION_CURRENT_KEY_VERSION'),
  );
}

function getKeyForVersion(keyring: Keyring, keyVersion: number) {
  const key = keyring.get(keyVersion);

  if (!key) {
    throw new PersonalGuestLinkEncryptionError();
  }

  return key;
}

function decodeCiphertext(ciphertext: string) {
  const parts = ciphertext.split('.');

  if (parts.length !== CIPHERTEXT_PARTS || parts[0] !== 'v1') {
    throw new PersonalGuestLinkEncryptionError();
  }

  const iv = Buffer.from(parts[1] ?? '', 'base64url');
  const tag = Buffer.from(parts[2] ?? '', 'base64url');
  const encrypted = Buffer.from(parts[3] ?? '', 'base64url');

  if (iv.length !== AES_GCM_IV_BYTES || tag.length !== 16 || encrypted.length === 0) {
    throw new PersonalGuestLinkEncryptionError();
  }

  return { encrypted, iv, tag };
}

/** Encrypts only an opaque capability token. It never accepts a full personal URL. */
export function encryptPersonalGuestToken(token: string): EncryptedPersonalGuestToken {
  const keyring = readKeyring();
  const keyVersion = readCurrentKeyVersion();
  const key = getKeyForVersion(keyring, keyVersion);
  const iv = randomBytes(AES_GCM_IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: [
      'v1',
      iv.toString('base64url'),
      tag.toString('base64url'),
      encrypted.toString('base64url'),
    ].join('.'),
    keyVersion,
  };
}

/** Decrypts only after the caller has completed its server-side owner authorization. */
export function decryptPersonalGuestToken(input: EncryptedPersonalGuestToken) {
  const key = getKeyForVersion(readKeyring(), input.keyVersion);
  const { encrypted, iv, tag } = decodeCiphertext(input.ciphertext);

  try {
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  } catch {
    throw new PersonalGuestLinkEncryptionError();
  }
}
