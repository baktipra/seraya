'use client';

import { createBrowserClient } from '@supabase/ssr';

import type { SerayaSupabaseClient } from './types';

let browserClient: SerayaSupabaseClient | undefined;

function requirePublicSupabaseCredentials() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env.local and set the Supabase public credentials.',
    );
  }

  return { url, anonKey };
}

export function createBrowserSupabaseClient(): SerayaSupabaseClient {
  if (browserClient) {
    return browserClient;
  }

  const { url, anonKey } = requirePublicSupabaseCredentials();
  browserClient = createBrowserClient(url, anonKey);

  return browserClient;
}
