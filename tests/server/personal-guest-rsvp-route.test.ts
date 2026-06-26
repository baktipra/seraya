import { randomBytes } from 'node:crypto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { parsePersonalGuestRsvpSubmissionMock, submitPersonalGuestRsvpMock } = vi.hoisted(() => ({
  parsePersonalGuestRsvpSubmissionMock: vi.fn(),
  submitPersonalGuestRsvpMock: vi.fn(),
}));

vi.mock('@/modules/guest-links', () => ({
  parsePersonalGuestRsvpSubmission: parsePersonalGuestRsvpSubmissionMock,
  submitPersonalGuestRsvp: submitPersonalGuestRsvpMock,
}));

import { POST } from '@/app/[slug]/g/[guestToken]/rsvp/route';

function makeRequest(status: string, attendeeCount?: string) {
  const formData = new FormData();
  formData.set('status', status);
  if (attendeeCount !== undefined) {
    formData.set('attendeeCount', attendeeCount);
  }
  return new Request('https://seraya.example/raka-nadia/g/capability/rsvp', {
    body: formData,
    method: 'POST',
  });
}

describe('SRY-028 anonymous RSVP route handler', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://seraya.example';
    parsePersonalGuestRsvpSubmissionMock.mockReset();
    submitPersonalGuestRsvpMock.mockReset();
  });

  it('posts only route capability plus parsed status/count, then reloads the no-store personal page', async () => {
    const guestToken = randomBytes(32).toString('base64url');
    parsePersonalGuestRsvpSubmissionMock.mockReturnValue({
      data: { attendeeCount: 2, status: 'attending' },
      success: true,
    });
    submitPersonalGuestRsvpMock.mockResolvedValue('attending');

    const response = await POST(makeRequest('attending', '2'), {
      params: Promise.resolve({ guestToken, slug: 'raka-nadia' }),
    });

    expect(submitPersonalGuestRsvpMock).toHaveBeenCalledWith({
      attendeeCount: 2,
      slug: 'raka-nadia',
      status: 'attending',
      token: guestToken,
    });
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe(
      `https://seraya.example/raka-nadia/g/${guestToken}?rsvp=success`,
    );
    expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0');
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow, noarchive');
  });

  it('returns the same generic unavailable response for invalid form choice/count or invalid capability', async () => {
    const guestToken = randomBytes(32).toString('base64url');
    parsePersonalGuestRsvpSubmissionMock.mockReturnValue({ success: false });

    const response = await POST(makeRequest('attending', '0'), {
      params: Promise.resolve({ guestToken, slug: 'raka-nadia' }),
    });

    expect(submitPersonalGuestRsvpMock).not.toHaveBeenCalled();
    expect(response.status).toBe(404);
    expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0');
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow, noarchive');
  });
});
