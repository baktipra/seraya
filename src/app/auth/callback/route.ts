import { NextResponse, type NextRequest } from 'next/server';

import { getSafeDashboardPath } from '@/modules/auth/redirects';
import { createServerSupabaseClient } from '@/server/supabase/server';

function redirectToLogin(request: NextRequest, notice: string) {
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('notice', notice);
  loginUrl.searchParams.set('next', getSafeDashboardPath(request.nextUrl.searchParams.get('next')));

  const response = NextResponse.redirect(loginUrl);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');

  if (!code) {
    return redirectToLogin(request, 'auth_failed');
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return redirectToLogin(request, 'auth_failed');
    }
  } catch {
    return redirectToLogin(request, 'auth_failed');
  }

  const dashboardUrl = new URL(
    getSafeDashboardPath(request.nextUrl.searchParams.get('next')),
    request.url,
  );
  const response = NextResponse.redirect(dashboardUrl);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
