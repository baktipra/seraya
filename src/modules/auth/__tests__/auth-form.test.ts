import { describe, expect, it, vi } from 'vitest';

import { requestMagicLink, validateLoginEmail } from '@/modules/auth/auth-form';
import type { SerayaSupabaseClient } from '@/server/supabase/types';

function createSupabaseMock(error: Error | null) {
  const signInWithOtp = vi.fn().mockResolvedValue({ error });

  return {
    client: {
      auth: {
        signInWithOtp,
      },
    } as unknown as SerayaSupabaseClient,
    signInWithOtp,
  };
}

describe('login form auth behavior', () => {
  it('validates email before making a Supabase request', async () => {
    expect(validateLoginEmail('')).toBe('Masukkan alamat email kamu terlebih dahulu.');
    expect(validateLoginEmail('bukan-email')).toBe('Masukkan alamat email yang valid.');

    const { client, signInWithOtp } = createSupabaseMock(null);
    const result = await requestMagicLink({
      callbackUrl: 'http://localhost:3000/auth/callback?next=%2Fdashboard',
      email: 'bukan-email',
      supabase: client,
    });

    expect(result).toEqual({ message: 'Masukkan alamat email yang valid.', status: 'invalid' });
    expect(signInWithOtp).not.toHaveBeenCalled();
  });

  it('returns the sent state after a successful magic-link request', async () => {
    const { client, signInWithOtp } = createSupabaseMock(null);
    const result = await requestMagicLink({
      callbackUrl: 'http://localhost:3000/auth/callback?next=%2Fdashboard',
      email: 'pasangan@example.com',
      supabase: client,
    });

    expect(result).toEqual({ status: 'sent' });
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: 'pasangan@example.com',
      options: {
        emailRedirectTo: 'http://localhost:3000/auth/callback?next=%2Fdashboard',
      },
    });
  });

  it('returns a human-safe error state when Supabase rejects the request', async () => {
    const { client } = createSupabaseMock(new Error('provider setup detail should not leak'));
    const result = await requestMagicLink({
      callbackUrl: 'http://localhost:3000/auth/callback?next=%2Fdashboard',
      email: 'pasangan@example.com',
      supabase: client,
    });

    expect(result).toEqual({
      message: 'Kami belum bisa mengirim link masuk. Coba lagi sebentar lagi.',
      status: 'error',
    });
  });
});
