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
import type { WeddingReadinessV1 } from '@/modules/readiness';

const projectId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

function createReadiness(overrides: Partial<WeddingReadinessV1> = {}): WeddingReadinessV1 {
  return {
    identity: { coupleLabel: 'Raka & Nadia', templateKey: 'roselle' },
    invitation: {
      hasPublishedSnapshot: false,
      hasUnpublishedChanges: false,
      hasVerifiedActivation: false,
      publishedSlug: null,
      state: 'draft_ready_unactivated',
    },
    guests: {
      activeGuestCount: 0,
      activePersonalLinkGuestCount: 0,
      guestsWithoutActivePersonalLinkCount: 0,
      whatsappAvailableCount: 0,
      whatsappUnavailableCount: 0,
    },
    primaryAction: { href: `/dashboard/${projectId}/preview`, key: 'preview_invitation' },
    responses: {
      activeGuestbookCount: 0,
      attendingCount: 0,
      confirmedAttendeeCount: 0,
      declinedCount: 0,
      hasActivePersonalLinks: false,
      nonPendingRsvpCount: 0,
    },
    ...overrides,
  };
}

describe('SRY-031 dashboard and conditional project navigation surfaces', () => {
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
  });

  it('keeps the global dashboard nav as a project launcher rather than feature navigation', () => {
    const html = renderToStaticMarkup(<DashboardDesktopNavigation />);

    expect(html).toContain('Navigasi undangan');
    expect(html).toContain('Semua undangan');
    expect(html).toContain('Buat undangan');
    expect(html).toContain('href="/dashboard"');
    expect(html).toContain('href="/dashboard/new"');
    expect(html).not.toContain('coming-soon');
    expect(html).not.toContain('Tagihan');
  });

  it('shows only Ringkasan, Undangan, and Tamu before publish', () => {
    const html = renderToStaticMarkup(
      <ProjectNavigation projectId={projectId} readiness={createReadiness()} />,
    );

    expect(html).toContain('Ringkasan');
    expect(html).toContain('Undangan');
    expect(html).toContain('Tamu');
    expect(html).not.toContain('Bagikan');
    expect(html).not.toContain('Respons Tamu');
    expect(html).not.toContain('coming-soon');
  });

  it('adds Bagikan after publish and Respons Tamu after the first active personal link', () => {
    const publishedHtml = renderToStaticMarkup(
      <ProjectNavigation
        projectId={projectId}
        readiness={createReadiness({
          invitation: {
            hasPublishedSnapshot: true,
            hasUnpublishedChanges: false,
            hasVerifiedActivation: true,
            publishedSlug: 'raka-nadia',
            state: 'published',
          },
        })}
      />,
    );
    const responsesHtml = renderToStaticMarkup(
      <ProjectNavigation
        projectId={projectId}
        readiness={createReadiness({
          invitation: {
            hasPublishedSnapshot: true,
            hasUnpublishedChanges: false,
            hasVerifiedActivation: true,
            publishedSlug: 'raka-nadia',
            state: 'published',
          },
          responses: {
            activeGuestbookCount: 0,
            attendingCount: 0,
            confirmedAttendeeCount: 0,
            declinedCount: 0,
            hasActivePersonalLinks: true,
            nonPendingRsvpCount: 0,
          },
        })}
      />,
    );

    expect(publishedHtml).toContain('Bagikan');
    expect(publishedHtml).not.toContain('Respons Tamu');
    expect(responsesHtml).toContain('Bagikan');
    expect(responsesHtml).toContain('Respons Tamu');
    expect(responsesHtml).toContain(`href="/dashboard/${projectId}/rsvp"`);
  });
});
