import type React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { WeddingReadinessV1 } from '@/modules/readiness';

const { publishActionMock, refreshMock, toastMock } = vi.hoisted(() => ({
  publishActionMock: vi.fn(),
  refreshMock: vi.fn(),
  toastMock: vi.fn(),
}));

type SurfaceProps = {
  children?: React.ReactNode;
  [key: string]: unknown;
};

type ButtonProps = SurfaceProps & {
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit';
};

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock('@/config/site', () => ({
  siteConfig: { url: 'http://localhost:3000' },
}));

vi.mock('@/design-system', () => ({
  Badge: ({ children }: SurfaceProps) => <span>{children}</span>,
  Button: ({ children, disabled, type = 'button' }: ButtonProps) => (
    <button disabled={disabled} type={type}>
      {children}
    </button>
  ),
  Card: ({ children }: SurfaceProps) => <section>{children}</section>,
  CardContent: ({ children }: SurfaceProps) => <div>{children}</div>,
  CardDescription: ({ children }: SurfaceProps) => <p>{children}</p>,
  CardHeader: ({ children }: SurfaceProps) => <header>{children}</header>,
  CardTitle: ({ children }: SurfaceProps) => <h2>{children}</h2>,
  Dialog: ({ children, description, title }: SurfaceProps) => (
    <div aria-label={String(title)}>
      <p>{String(description)}</p>
      {children}
    </div>
  ),
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/modules/publications/publication.actions', () => ({
  publishInvitationAction: publishActionMock,
}));

import { ProjectOverviewBootstrap } from '@/components/projects/project-overview-bootstrap';
import { PublishInvitationControls } from '@/components/projects/publish-invitation-controls';

const projectId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

function createReadiness(overrides: Partial<WeddingReadinessV1> = {}): WeddingReadinessV1 {
  return {
    identity: { coupleLabel: 'Raka & Nadia', templateKey: 'roselle' },
    invitation: {
      hasPublishedSnapshot: false,
      hasUnpublishedChanges: false,
      hasVerifiedActivation: true,
      publishedSlug: null,
      state: 'ready_to_publish',
    },
    guests: {
      activeGuestCount: 0,
      activePersonalLinkGuestCount: 0,
      guestsWithoutActivePersonalLinkCount: 0,
      whatsappAvailableCount: 0,
      whatsappUnavailableCount: 0,
      readyToDistributeCount: 0,
      noPersonalInvitationCount: 0,
      needsLinkUpdateCount: 0,
      needsWhatsAppCount: 0,
    },
    primaryAction: { key: 'publish_invitation' },
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

describe('SRY-041 project compass publish handoff', () => {
  beforeEach(() => {
    publishActionMock.mockReset().mockResolvedValue({ status: 'idle' });
    refreshMock.mockReset();
    toastMock.mockReset();
  });

  it('hands draft publication review to Undangan with one calm primary CTA', () => {
    const html = renderToStaticMarkup(
      <ProjectOverviewBootstrap projectId={projectId} readiness={createReadiness()} />,
    );

    expect(html).toContain('Lengkapi undangan');
    expect(html).toContain(`href="/dashboard/${projectId}/invitation"`);
    expect(html).not.toContain(`href="/dashboard/${projectId}/billing"`);
    expect(publishActionMock).not.toHaveBeenCalled();
  });

  it('hands deterministic saved changes to Undangan while Ringkasan stays focused on one primary CTA', () => {
    const readiness = createReadiness({
      invitation: {
        hasPublishedSnapshot: true,
        hasUnpublishedChanges: true,
        hasVerifiedActivation: true,
        publishedSlug: 'raka-nadia',
        state: 'published_with_unpublished_changes',
      },
      primaryAction: { key: 'review_changes' },
    });
    const html = renderToStaticMarkup(
      <ProjectOverviewBootstrap projectId={projectId} readiness={readiness} />,
    );

    expect(html).toContain('Tinjau dan terbitkan ulang');
    expect(html).toContain('Tinjau di Undangan');
    expect(html).toContain(`href="/dashboard/${projectId}/invitation"`);
    expect(html).not.toContain(`href="/dashboard/${projectId}/billing"`);
    expect(publishActionMock).not.toHaveBeenCalled();
  });

  it('keeps confirmation mandatory and blocks unverified payment from the publish form', () => {
    const html = renderToStaticMarkup(
      <PublishInvitationControls
        hasActiveDraft
        intent="initial"
        presentation="default"
        projectId={projectId}
        publishedSlug={null}
        publishEligibility={{ allowed: false, reason: 'payment_not_verified' }}
      />,
    );

    expect(html).toContain('disabled=""');
    expect(html).toContain(
      'Pembayaran terverifikasi diperlukan sebelum undangan dapat dipublikasikan.',
    );
    expect(html).not.toContain('<form');
    expect(publishActionMock).not.toHaveBeenCalled();
  });
});
