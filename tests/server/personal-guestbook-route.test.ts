import { randomBytes } from 'node:crypto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { submitPersonalGuestbookEntryMock } = vi.hoisted(() => ({
  submitPersonalGuestbookEntryMock: vi.fn(),
}));

vi.mock('@/modules/guestbook/guestbook.service', () => ({
  submitPersonalGuestbookEntry: submitPersonalGuestbookEntryMock,
}));

import { POST } from '@/app/[slug]/g/[guestToken]/guestbook/route';

function makeRequest(message: string) {
  const formData = new FormData();
  formData.set('message', message);
  return new Request('https://seraya.example/raka-nadia/g/capability/guestbook', {
    body: formData,
    method: 'POST',
  });
}

describe('SRY-027 anonymous personal guestbook route', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://seraya.example';
    submitPersonalGuestbookEntryMock.mockReset();
  });

  it('posts only message plus route capability and returns to the no-store personal page', async () => {
    const guestToken = randomBytes(32).toString('base64url');
    submitPersonalGuestbookEntryMock.mockResolvedValue('created');

    const response = await POST(makeRequest('Semoga bahagia selalu'), {
      params: Promise.resolve({ guestToken, slug: 'raka-nadia' }),
    });

    expect(submitPersonalGuestbookEntryMock).toHaveBeenCalledWith({
      message: 'Semoga bahagia selalu',
      slug: 'raka-nadia',
      token: guestToken,
    });
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe(
      `https://seraya.example/raka-nadia/g/${guestToken}?guestbook=success`,
    );
    expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0');
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow, noarchive');
  });

  it('uses the same factual error redirect for invalid message, unavailable link, or rate-limit denial', async () => {
    const guestToken = randomBytes(32).toString('base64url');
    submitPersonalGuestbookEntryMock.mockResolvedValue(null);

    const unavailable = await POST(makeRequest('Semoga'), {
      params: Promise.resolve({ guestToken, slug: 'raka-nadia' }),
    });
    const invalid = await POST(makeRequest('   '), {
      params: Promise.resolve({ guestToken, slug: 'raka-nadia' }),
    });

    expect(unavailable.headers.get('location')).toBe(
      `https://seraya.example/raka-nadia/g/${guestToken}?guestbook=error`,
    );
    expect(invalid.headers.get('location')).toBe(
      `https://seraya.example/raka-nadia/g/${guestToken}?guestbook=error`,
    );
  });
});
