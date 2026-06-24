import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({
    children,
    prefetch,
    ...anchorProps
  }: {
    children: React.ReactNode;
    href: string;
    prefetch?: boolean;
    className?: string;
    'aria-current'?: 'page';
  }) => (
    <a {...anchorProps} data-prefetch={String(prefetch)}>
      {children}
    </a>
  ),
}));

import { LoginForm } from '@/components/auth/login-form';
import { DashboardEmptyState } from '@/components/dashboard/dashboard-empty-state';
import {
  DashboardDesktopNavigation,
  DashboardMobileNavigation,
} from '@/components/dashboard/dashboard-navigation';

const dashboardNavigationSource = resolve(
  process.cwd(),
  'src/components/dashboard/dashboard-navigation.tsx',
);

const dashboardNavigationHrefs = [
  '/dashboard',
  '/dashboard/coming-soon?feature=invitation',
  '/dashboard/coming-soon?feature=guests',
  '/dashboard/coming-soon?feature=share',
  '/dashboard/coming-soon?feature=billing',
  '/dashboard/coming-soon?feature=settings',
  '/dashboard/coming-soon?feature=help',
];

function expectPrefetchDisabledForEveryLink(html: string, expectedLinkCount: number) {
  const prefetchMatches = html.match(/data-prefetch="false"/g) ?? [];

  expect(prefetchMatches).toHaveLength(expectedLinkCount);
  expect(html).not.toContain('data-prefetch="true"');
}

describe('SRY-004 auth and dashboard shell surfaces', () => {
  it('renders an accessible login form shell', () => {
    const html = renderToStaticMarkup(<LoginForm nextPath="/dashboard" />);

    expect(html).toContain('Masuk ke Seraya');
    expect(html).toContain('for="login-email"');
    expect(html).toContain('Kirim link masuk');
    expect(html).toContain('Lanjutkan dengan Google');
  });

  it('renders the dashboard empty state for an authenticated account without a project', () => {
    const html = renderToStaticMarkup(<DashboardEmptyState />);

    expect(html).toContain('Belum ada undangan');
    expect(html).toContain('Buat undangan baru');
    expect(html).toContain('disabled');
  });

  it('renders desktop shell navigation with existing destinations and disabled prefetch', () => {
    const html = renderToStaticMarkup(<DashboardDesktopNavigation />);

    expect(html).toContain('Navigasi dashboard');
    expect(html).toContain('Overview');
    expect(html).toContain('Undangan');
    expect(html).toContain('Tamu');
    expect(html).toContain('Bagikan');
    expect(html).toContain('Tagihan');
    expect(html).toContain('Pengaturan');
    expect(html).toContain('Bantuan');
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);

    for (const href of dashboardNavigationHrefs) {
      expect(html).toContain(`href="${href.replaceAll('&', '&amp;')}"`);
    }

    expectPrefetchDisabledForEveryLink(html, dashboardNavigationHrefs.length);
  });

  it('renders mobile bottom navigation with existing destinations and disabled prefetch', () => {
    const html = renderToStaticMarkup(<DashboardMobileNavigation />);
    const mobileHrefs = dashboardNavigationHrefs.slice(0, 4);

    expect(html).toContain('Navigasi utama dashboard');
    expect(html).toContain('Overview');
    expect(html).toContain('Undangan');
    expect(html).toContain('Tamu');
    expect(html).toContain('Bagikan');
    expect(html).toContain('bottom-0');
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);

    for (const href of mobileHrefs) {
      expect(html).toContain(`href="${href.replaceAll('&', '&amp;')}"`);
    }

    expectPrefetchDisabledForEveryLink(html, mobileHrefs.length);
  });

  it('keeps the shared navigation free of client-side Supabase and custom navigation runtime code', async () => {
    const source = await readFile(dashboardNavigationSource, 'utf8');

    expect(source).toContain('prefetch={false}');
    expect(source).not.toMatch(/@\/server\/supabase|@supabase\/supabase-js|createBrowserClient/);
    expect(source).not.toMatch(/router\.prefetch|useRouter\(/);
  });
});
