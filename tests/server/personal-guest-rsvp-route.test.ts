import { randomBytes } from 'node:crypto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { submitPersonalGuestRsvpMock } = vi.hoisted(() => ({
  submitPersonalGuestRsvpMock: vi.fn(),
}));

vi.mock('@/modules/guest-links', () => ({
  submitPersonalGuestRsvp: submitPersonalGuestRsvpMock,
}));

import { POST } from '@/app/[slug]/g/[guestToken]/rsvp/route';

function makeRequest(status: string) {
  const formData = new FormData();
  formData.set('status', status);
  return new Request('https://seraya.example/raka-nadia/g/capability/rsvp', {
    body: formData,
    method: 'POST',
  });
}

describe('SRY-013 anonymous RSVP route handler', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://seraya.example';
    submitPersonalGuestRsvpMock.mockReset();
  });

  it('posts only the route capability and requested status, then reloads the no-store personal page', async () => {
    const guestToken = randomBytes(32).toString('base64url');
    submitPersonalGuestRsvpMock.mockResolvedValue('attending');

    const response = await POST(makeRequest('attending'), {
      params: Promise.resolve({ guestToken, slug: 'raka-nadia' }),
    });

    expect(submitPersonalGuestRsvpMock).toHaveBeenCalledWith({
      slug: 'raka-nadia',
      status: 'attending',
      token: guestToken,
    });
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe(
      `https://seraya.example/raka-nadia/g/${guestToken}`,
    );
    expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0');
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow, noarchive');
  });

  it('returns the same generic unavailable response for invalid choice or invalid capability', async () => {
    const guestToken = randomBytes(32).toString('base64url');
    submitPersonalGuestRsvpMock.mockResolvedValue(null);

    const response = await POST(makeRequest('pending'), {
      params: Promise.resolve({ guestToken, slug: 'raka-nadia' }),
    });

    expect(response.status).toBe(404);
    expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0');
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow, noarchive');
  });
});
