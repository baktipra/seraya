import { afterEach, describe, expect, it } from 'vitest';

import { buildPersonalGuestInvitationUrl } from '../guest-link-url';

const initialAppUrl = process.env.NEXT_PUBLIC_APP_URL;

afterEach(() => {
  if (initialAppUrl === undefined) {
    delete process.env.NEXT_PUBLIC_APP_URL;
    return;
  }

  process.env.NEXT_PUBLIC_APP_URL = initialAppUrl;
});

describe('personal guest invitation URL', () => {
  it('continues to use only the configured application origin and the locked personalized path', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://sandbox.seraya.example';

    expect(
      buildPersonalGuestInvitationUrl({
        slug: 'raka-nadia',
        token: 'opaque-token',
      }),
    ).toBe('https://sandbox.seraya.example/raka-nadia/g/opaque-token');
  });
});
