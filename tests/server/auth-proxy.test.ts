import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { createServerClientMock } = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: createServerClientMock,
}));

import { proxy } from '@/proxy';

describe('SRY-004 dashboard request proxy', () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    createServerClientMock.mockReset();
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalAnonKey;
  });

  it('redirects unauthenticated dashboard routes, including project creation, to login safely', async () => {
    const dashboardResponse = await proxy(new NextRequest('http://localhost:3000/dashboard'));
    const newProjectResponse = await proxy(new NextRequest('http://localhost:3000/dashboard/new'));
    const previewResponse = await proxy(
      new NextRequest(
        'http://localhost:3000/dashboard/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/preview',
      ),
    );
    const guestsResponse = await proxy(
      new NextRequest(
        'http://localhost:3000/dashboard/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/guests',
      ),
    );

    expect(dashboardResponse.status).toBe(307);
    expect(dashboardResponse.headers.get('location')).toBe(
      'http://localhost:3000/login?next=%2Fdashboard',
    );
    expect(newProjectResponse.status).toBe(307);
    expect(newProjectResponse.headers.get('location')).toBe(
      'http://localhost:3000/login?next=%2Fdashboard%2Fnew',
    );
    expect(previewResponse.status).toBe(307);
    expect(previewResponse.headers.get('location')).toBe(
      'http://localhost:3000/login?next=%2Fdashboard%2Faaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa%2Fpreview',
    );
    expect(guestsResponse.status).toBe(307);
    expect(guestsResponse.headers.get('location')).toBe(
      'http://localhost:3000/login?next=%2Fdashboard%2Faaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa%2Fguests',
    );
    expect(createServerClientMock).not.toHaveBeenCalled();
  });

  it('allows an authenticated session to enter dashboard routes, including project setup', async () => {
    const getUser = vi.fn().mockResolvedValue({
      data: {
        user: {
          id: '11111111-1111-1111-1111-111111111111',
        },
      },
    });
    createServerClientMock.mockReturnValue({ auth: { getUser } });

    const response = await proxy(
      new NextRequest('http://localhost:3000/dashboard/new', {
        headers: {
          cookie: 'sb-seraya-auth-token=fixture',
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(getUser).toHaveBeenCalledTimes(1);
  });

  it('redirects an authenticated visitor away from login', async () => {
    const getUser = vi.fn().mockResolvedValue({
      data: {
        user: {
          id: '11111111-1111-1111-1111-111111111111',
        },
      },
    });
    createServerClientMock.mockReturnValue({ auth: { getUser } });

    const response = await proxy(
      new NextRequest('http://localhost:3000/login', {
        headers: {
          cookie: 'sb-seraya-auth-token=fixture',
        },
      }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/dashboard');
  });
});
