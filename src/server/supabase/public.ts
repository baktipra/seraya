import 'server-only';

import { createClient } from '@supabase/supabase-js';

import type { SerayaSupabaseClient } from './types';

function requirePublicSupabaseCredentials() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env.local and set the Supabase public credentials.',
    );
  }

  return { anonKey, url };
}

/**
 * Stateless anonymous client for public published invitations. It deliberately
 * has no cookie adapter, no session persistence, and no auto-refresh behavior.
 */
export function createPublicSupabaseClient(): SerayaSupabaseClient {
  const { anonKey, url } = requirePublicSupabaseCredentials();

  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
