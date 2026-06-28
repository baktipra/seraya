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
  }) => (
    <a {...anchorProps} data-prefetch={String(prefetch)}>
      {children}
    </a>
  ),
}));

import { LoginForm } from '@/components/auth/login-form';
import { DashboardEmptyState } from '@/components/dashboard/dashboard-empty-state';
import { DashboardDesktopNavigation } from '@/components/dashboard/dashboard-navigation';
import { ProjectNavigation } from '@/components/dashboard/project-navigation';

const projectId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

describe('SRY-039 owner workspace navigation', () => {
  it('renders an accessible login form shell', () => {
    const html = renderToStaticMarkup(<LoginForm nextPath="/dashboard" />);
    expect(html).toContain('Masuk ke Seraya');
    expect(html).toContain('for="login-email"');
  });

  it('keeps the global dashboard nav as a project launcher', () => {
    const html = renderToStaticMarkup(<DashboardDesktopNavigation />);
    expect(html).toContain('Semua undangan');
    expect(html).toContain('Buat undangan');
  });

  it('keeps the project journey stable as Ringkasan, Undangan, Tamu, Bagikan, and Respons Tamu', () => {
    const html = renderToStaticMarkup(<ProjectNavigation projectId={projectId} />);
    for (const label of ['Ringkasan', 'Undangan', 'Tamu', 'Bagikan', 'Respons Tamu']) {
      expect(html).toContain(label);
    }
    expect(html).toContain(`href="/dashboard/${projectId}/delivery"`);
    expect(html).toContain(`href="/dashboard/${projectId}/rsvp"`);
    expect(html).not.toContain('coming-soon');
  });

  it('renders the dashboard empty state for an authenticated account without a project', () => {
    const html = renderToStaticMarkup(<DashboardEmptyState />);
    expect(html).toContain('Belum ada undangan');
  });
});
