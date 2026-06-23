import 'server-only';

import { createClient } from '@supabase/supabase-js';

import type { SerayaSupabaseClient } from './types';

function requireAdminSupabaseCredentials() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. The service-role client is server-only and must never be exposed to the browser.',
    );
  }

  return { url, serviceRoleKey };
}

/**
 * Privileged server-only client. Use only for explicitly server-owned actions.
 * RLS is bypassed by the service role, so callers must enforce their own authorization.
 */
export function createAdminSupabaseClient(): SerayaSupabaseClient {
  const { url, serviceRoleKey } = requireAdminSupabaseCredentials();

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
