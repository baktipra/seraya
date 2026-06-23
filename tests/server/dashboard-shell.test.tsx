import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { LoginForm } from '@/components/auth/login-form';
import { DashboardEmptyState } from '@/components/dashboard/dashboard-empty-state';
import {
  DashboardDesktopNavigation,
  DashboardMobileNavigation,
} from '@/components/dashboard/dashboard-navigation';

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

  it('renders desktop shell navigation', () => {
    const html = renderToStaticMarkup(<DashboardDesktopNavigation />);

    expect(html).toContain('Navigasi dashboard');
    expect(html).toContain('Overview');
    expect(html).toContain('Tagihan');
    expect(html).toContain('Pengaturan');
    expect(html).toContain('Bantuan');
  });

  it('renders mobile bottom navigation', () => {
    const html = renderToStaticMarkup(<DashboardMobileNavigation />);

    expect(html).toContain('Navigasi utama dashboard');
    expect(html).toContain('Undangan');
    expect(html).toContain('Tamu');
    expect(html).toContain('Bagikan');
    expect(html).toContain('bottom-0');
  });
});
