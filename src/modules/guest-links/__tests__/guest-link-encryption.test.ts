import { describe, expect, it } from 'vitest';

import {
  decryptPersonalGuestToken,
  encryptPersonalGuestToken,
  PersonalGuestLinkEncryptionError,
} from '../guest-link-encryption';

describe('SRY-038 owner-safe personal-link encryption', () => {
  it('uses authenticated ciphertext with a key version and never persists plaintext in the payload', () => {
    const token = 'personal-capability-token-for-test-only';
    const encrypted = encryptPersonalGuestToken(token);

    expect(encrypted.keyVersion).toBe(1);
    expect(encrypted.ciphertext).toMatch(/^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    expect(encrypted.ciphertext).not.toContain(token);
    expect(decryptPersonalGuestToken(encrypted)).toBe(token);
  });

  it('rejects authenticated ciphertext that was modified', () => {
    const encrypted = encryptPersonalGuestToken('opaque-token');
    const [version, iv, tag, payload] = encrypted.ciphertext.split('.');
    const changedTag = `${tag?.startsWith('A') ? 'B' : 'A'}${tag?.slice(1) ?? ''}`;
    const tampered = [version, iv, changedTag, payload].join('.');

    expect(() =>
      decryptPersonalGuestToken({ ciphertext: tampered, keyVersion: encrypted.keyVersion }),
    ).toThrow(PersonalGuestLinkEncryptionError);
  });
});
