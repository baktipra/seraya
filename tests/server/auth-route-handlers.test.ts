import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { createServerSupabaseClientMock } = vi.hoisted(() => ({
  createServerSupabaseClientMock: vi.fn(),
}));

vi.mock('@/server/supabase/server', () => ({
  createServerSupabaseClient: createServerSupabaseClientMock,
}));

import { GET as authCallback } from '@/app/auth/callback/route';
import { POST as signOut } from '@/app/auth/signout/route';

describe('SRY-004 auth route handlers', () => {
  beforeEach(() => {
    createServerSupabaseClientMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exchanges a valid callback code and redirects only to an internal dashboard path', async () => {
    const exchangeCodeForSession = vi.fn().mockResolvedValue({ error: null });
    createServerSupabaseClientMock.mockResolvedValue({ auth: { exchangeCodeForSession } });

    const response = await authCallback(
      new NextRequest(
        'http://localhost:3000/auth/callback?code=fixture&next=https://attacker.example',
      ),
    );

    expect(exchangeCodeForSession).toHaveBeenCalledWith('fixture');
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/dashboard');
  });

  it('returns a human-safe login recovery route if the callback cannot exchange a session', async () => {
    createServerSupabaseClientMock.mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi
          .fn()
          .mockResolvedValue({ error: new Error('raw provider detail') }),
      },
    });

    const response = await authCallback(
      new NextRequest('http://localhost:3000/auth/callback?code=fixture&next=%2Fdashboard%2Fsafe'),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/login?notice=auth_failed&next=%2Fdashboard%2Fsafe',
    );
  });

  it('clears the session through Supabase signOut and routes to login', async () => {
    const signOutMock = vi.fn().mockResolvedValue({ error: null });
    createServerSupabaseClientMock.mockResolvedValue({ auth: { signOut: signOutMock } });

    const response = await signOut(
      new NextRequest('http://localhost:3000/auth/signout', { method: 'POST' }),
    );

    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('http://localhost:3000/login?notice=signed_out');
  });
});
