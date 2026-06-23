import { describe, expect, it } from 'vitest';

import {
  DEFAULT_DASHBOARD_PATH,
  createAuthCallbackUrl,
  getSafeDashboardPath,
  isDashboardPath,
} from '@/modules/auth/redirects';

describe('auth redirect safety', () => {
  it('keeps only internal dashboard paths', () => {
    expect(getSafeDashboardPath('/dashboard/project-a/guests?filter=pending')).toBe(
      '/dashboard/project-a/guests?filter=pending',
    );
    expect(getSafeDashboardPath('/dashboard')).toBe('/dashboard');
  });

  it('rejects external, protocol-relative, and non-dashboard return paths', () => {
    expect(getSafeDashboardPath('https://attacker.example/dashboard')).toBe(DEFAULT_DASHBOARD_PATH);
    expect(getSafeDashboardPath('//attacker.example/dashboard')).toBe(DEFAULT_DASHBOARD_PATH);
    expect(getSafeDashboardPath('/login')).toBe(DEFAULT_DASHBOARD_PATH);
  });

  it('creates a callback URL with only a safe next path', () => {
    expect(createAuthCallbackUrl('https://seraya.example', 'https://attacker.example')).toBe(
      'https://seraya.example/auth/callback?next=%2Fdashboard',
    );
  });

  it('recognizes the dashboard route family', () => {
    expect(isDashboardPath('/dashboard')).toBe(true);
    expect(isDashboardPath('/dashboard/project-a/invitation')).toBe(true);
    expect(isDashboardPath('/login')).toBe(false);
  });
});
