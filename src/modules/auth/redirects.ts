export const DEFAULT_DASHBOARD_PATH = '/dashboard';

/**
 * Accept only a same-origin dashboard route. This intentionally drops hashes
 * and rejects external URLs, protocol-relative URLs, and non-dashboard paths.
 */
export function getSafeDashboardPath(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return DEFAULT_DASHBOARD_PATH;
  }

  try {
    const candidate = new URL(value, 'http://seraya.local');

    if (candidate.origin !== 'http://seraya.local') {
      return DEFAULT_DASHBOARD_PATH;
    }

    if (candidate.pathname !== '/dashboard' && !candidate.pathname.startsWith('/dashboard/')) {
      return DEFAULT_DASHBOARD_PATH;
    }

    return `${candidate.pathname}${candidate.search}`;
  } catch {
    return DEFAULT_DASHBOARD_PATH;
  }
}

export function isDashboardPath(pathname: string): boolean {
  return pathname === '/dashboard' || pathname.startsWith('/dashboard/');
}

export function createAuthCallbackUrl(origin: string, nextPath?: string | null): string {
  const callbackUrl = new URL('/auth/callback', origin);
  callbackUrl.searchParams.set('next', getSafeDashboardPath(nextPath));

  return callbackUrl.toString();
}
