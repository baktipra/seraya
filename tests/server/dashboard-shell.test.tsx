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

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
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

  it('keeps the global dashboard nav focused on returning to the project collection', () => {
    const html = renderToStaticMarkup(<DashboardDesktopNavigation />);
    expect(html).toContain('Semua undangan');
    expect(html).not.toContain('Buat undangan');
  });

  it('keeps exactly the five canonical project workspaces', () => {
    const html = renderToStaticMarkup(
      <ProjectNavigation
        coupleLabel="Ayu & Bima"
        projectId={projectId}
        statusLabel="Draft sedang disusun"
      />,
    );
    for (const label of ['Ringkasan', 'Undangan', 'Tamu', 'Bagikan', 'Respons Tamu']) {
      expect(html).toContain(label);
    }
    expect(html).toContain(`href="/dashboard/${projectId}/delivery"`);
    expect(html).toContain(`href="/dashboard/${projectId}/rsvp"`);
    expect(html).not.toContain('Tindak Lanjut');
    expect(html).not.toContain(`/dashboard/${projectId}/follow-up`);
    expect(html).toContain('aria-current="page"');
    expect(html).not.toContain('coming-soon');
  });

  it('renders the dashboard empty state for an authenticated account without a project', () => {
    const html = renderToStaticMarkup(<DashboardEmptyState />);
    expect(html).toContain('Mulai dari pengalaman yang terasa paling dekat.');
  });
});
