import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock('@/config/site', () => ({
  siteConfig: { url: 'http://localhost:3000' },
}));

vi.mock('@/design-system', () => ({
  Button: ({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) => (
    <button disabled={disabled} type="button">
      {children}
    </button>
  ),
  Dialog: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div aria-label={title}>{children}</div>
  ),
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/modules/publications/publication.actions', () => ({
  publishInvitationAction: async () => ({ status: 'idle' }),
}));

import { PublishInvitationControls } from '@/components/projects/publish-invitation-controls';

const projectId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

describe('payment-gated publish controls', () => {
  it('disables publish and directs an unpaid owner to billing', () => {
    const html = renderToStaticMarkup(
      <PublishInvitationControls
        hasActiveDraft
        projectId={projectId}
        publishedSlug={null}
        publishEligibility={{ allowed: false, reason: 'payment_required' }}
      />,
    );

    expect(html).toContain('disabled=""');
    expect(html).toContain('Selesaikan pembayaran terverifikasi untuk mempublikasikan undangan.');
    expect(html).toContain(`href="/dashboard/${projectId}/billing"`);
  });

  it('keeps a legacy published link visible but disables republish without paid entitlement', () => {
    const html = renderToStaticMarkup(
      <PublishInvitationControls
        hasActiveDraft
        projectId={projectId}
        publishedSlug="raka-nadia"
        publishEligibility={{ allowed: false, reason: 'payment_not_verified' }}
      />,
    );

    expect(html).toContain('http://localhost:3000/raka-nadia');
    expect(html).toContain('Terbitkan perubahan');
    expect(html).toContain('Pembayaran terverifikasi diperlukan untuk menerbitkan perubahan baru.');
    expect(html).toContain('disabled=""');
  });

  it('enables the manual publish confirmation only after verified payment', () => {
    const html = renderToStaticMarkup(
      <PublishInvitationControls
        hasActiveDraft
        projectId={projectId}
        publishedSlug={null}
        publishEligibility={{ allowed: true, reason: 'verified_payment' }}
      />,
    );

    expect(html).toContain('Terbitkan undangan');
    expect(html).not.toContain(
      'Selesaikan pembayaran terverifikasi untuk mempublikasikan undangan.',
    );
  });
});
