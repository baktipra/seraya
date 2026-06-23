import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import {
  DEFAULT_DASHBOARD_PATH,
  getSafeDashboardPath,
  isDashboardPath,
} from '@/modules/auth/redirects';

function getPublicSupabaseCredentials() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return { anonKey, url };
}

function hasSupabaseAuthCookie(request: NextRequest) {
  return request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith('sb-') && cookie.name.includes('-auth-token'));
}

function applyPrivateNoStore(response: NextResponse) {
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

function copySessionCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
}

function redirectToLogin(request: NextRequest) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = '/login';
  redirectUrl.search = '';
  redirectUrl.searchParams.set(
    'next',
    getSafeDashboardPath(`${request.nextUrl.pathname}${request.nextUrl.search}`),
  );

  return applyPrivateNoStore(NextResponse.redirect(redirectUrl));
}

function redirectToDashboard(request: NextRequest) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = DEFAULT_DASHBOARD_PATH;
  redirectUrl.search = '';

  return applyPrivateNoStore(NextResponse.redirect(redirectUrl));
}

/**
 * Supabase SSR request boundary. It refreshes a cookie-backed session before
 * protected server components render, then applies server-side dashboard auth.
 */
export async function updateSupabaseSession(request: NextRequest): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;
  const dashboardRequest = isDashboardPath(pathname);
  const loginRequest = pathname === '/login';

  // No session cookie cannot be authenticated. This fast path keeps local route
  // protection testable without a configured Supabase service and avoids a
  // needless auth-network request for clearly anonymous dashboard visits.
  if (dashboardRequest && !hasSupabaseAuthCookie(request)) {
    return redirectToLogin(request);
  }

  const credentials = getPublicSupabaseCredentials();

  // The login page remains renderable for setup/error recovery. A dashboard
  // route with a stale cookie but no configured client falls back safely.
  if (!credentials) {
    return dashboardRequest ? redirectToLogin(request) : NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(credentials.url, credentials.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, options, value }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  let user = null;

  try {
    const {
      data: { user: authenticatedUser },
    } = await supabase.auth.getUser();
    user = authenticatedUser;
  } catch {
    // Never expose an upstream auth failure to the browser. Protected routes
    // still fail closed; login remains available as the recovery entry point.
    user = null;
  }

  if (dashboardRequest && !user) {
    const redirect = redirectToLogin(request);
    copySessionCookies(response, redirect);
    return redirect;
  }

  if (loginRequest && user) {
    const redirect = redirectToDashboard(request);
    copySessionCookies(response, redirect);
    return redirect;
  }

  return applyPrivateNoStore(response);
}
