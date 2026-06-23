import { NextResponse, type NextRequest } from 'next/server';

import { createServerSupabaseClient } from '@/server/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
  } catch {
    // Sign-out must be idempotent. The browser is still returned to the public
    // login page even when a stale session could not be revoked upstream.
  }

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('notice', 'signed_out');

  const response = NextResponse.redirect(loginUrl, { status: 303 });
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
