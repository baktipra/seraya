import { describe, expect, it } from 'vitest';

import {
  generatePersonalGuestToken,
  hashPersonalGuestToken,
  isValidPersonalGuestToken,
  PERSONAL_GUEST_TOKEN_HASH_PATTERN,
  PERSONAL_GUEST_TOKEN_PATTERN,
} from '../guest-link-token';

describe('SRY-013 personal guest token security', () => {
  it('generates a URL-safe opaque capability with at least 256 bits of entropy', () => {
    const first = generatePersonalGuestToken();
    const second = generatePersonalGuestToken();

    expect(first).toMatch(PERSONAL_GUEST_TOKEN_PATTERN);
    expect(first).toHaveLength(43);
    expect(second).not.toBe(first);
    expect(isValidPersonalGuestToken(first)).toBe(true);
  });

  it('stores only a lowercase fixed-width SHA-256 hexadecimal digest', () => {
    const token = generatePersonalGuestToken();
    const hash = hashPersonalGuestToken(token);

    expect(hash).toMatch(PERSONAL_GUEST_TOKEN_HASH_PATTERN);
    expect(hash).toHaveLength(64);
    expect(hash).toBe(hashPersonalGuestToken(token));
  });

  it('rejects non-capability input before hashing', () => {
    expect(() => hashPersonalGuestToken('not-a-valid-personal-token')).toThrow(/invalid format/i);
  });
});
