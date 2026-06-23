import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import type { SerayaSupabaseClient } from './types';

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

/**
 * Request/session-aware client for server components, route handlers, and server actions.
 * It intentionally contains no business logic.
 */
export async function createServerSupabaseClient(): Promise<SerayaSupabaseClient> {
  const cookieStore = await cookies();
  const { url, anonKey } = requirePublicSupabaseCredentials();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot mutate response cookies. The future auth proxy
          // will own token refresh persistence once authentication UI is in scope.
        }
      },
    },
  });
}
