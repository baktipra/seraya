import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { DashboardEmptyState } from '@/components/dashboard/dashboard-empty-state';
import { DashboardProjectLauncher } from '@/components/dashboard/dashboard-project-launcher';
import { ProjectOverviewBootstrap } from '@/components/projects/project-overview-bootstrap';
import { ProjectSetupForm } from '@/components/projects/project-setup-form';
import type { WeddingReadinessV1 } from '@/modules/readiness';

const projectId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

const draftReadyReadiness: WeddingReadinessV1 = {
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
};

describe('SRY-031 project readiness surfaces', () => {
  it('activates the dashboard empty-state CTA for the new project route', () => {
    const html = renderToStaticMarkup(<DashboardEmptyState />);

    expect(html).toContain('action="/dashboard/new"');
    expect(html).toContain('Buat undangan baru');
    expect(html).not.toContain(' disabled=""');
  });

  it('renders a real project launcher list without fake metrics', () => {
    const html = renderToStaticMarkup(
      <DashboardProjectLauncher
        projects={[
          {
            coupleLabel: 'Raka & Nadia',
            event_city: 'Jakarta',
            event_date_primary: '2027-08-17',
            id: projectId,
            person_one_name: 'Raka',
            person_two_name: 'Nadia',
            status: 'draft',
          },
        ]}
      />,
    );

    expect(html).toContain('Raka &amp; Nadia');
    expect(html).toContain('17 Agustus 2027');
    expect(html).toContain(`action="/dashboard/${projectId}"`);
  });

  it('renders one calm primary action with readiness chapters instead of a feature-card dashboard', () => {
    const html = renderToStaticMarkup(
      <ProjectOverviewBootstrap projectId={projectId} readiness={draftReadyReadiness} />,
    );

    expect(html).toContain('Ringkasan persiapan undangan');
    expect(html).toContain('Siap ditinjau');
    expect(html).toContain('Roselle — romantis hangat');
    expect(html).toContain('Undangan siap ditinjau');
    expect(html).toContain('Lihat preview');
    expect(html).toContain(`href="/dashboard/${projectId}/preview"`);
    expect(html).toContain('Perjalanan kalian');
    expect(html).toContain('Undangan');
    expect(html).toContain('Tamu');
    expect(html).toContain('Respons');
    expect(html).toContain('Respons tamu akan tersedia setelah undangan pribadi mulai disiapkan.');
    expect(html).not.toContain('completion');
    expect(html).not.toContain('token_hash');
    expect(html).not.toContain('payment_transactions');
  });

  it('explains Link Publik versus Undangan Pribadi after publish and directs owners with no guests to Kelola Tamu', () => {
    const html = renderToStaticMarkup(
      <ProjectOverviewBootstrap
        projectId={projectId}
        readiness={{
          ...draftReadyReadiness,
          invitation: {
            hasPublishedSnapshot: true,
            hasUnpublishedChanges: false,
            hasVerifiedActivation: true,
            publishedSlug: 'raka-nadia',
            state: 'published',
          },
          primaryAction: { href: `/dashboard/${projectId}/guests`, key: 'add_guests' },
        }}
      />,
    );

    expect(html).toContain('Cara membagikan undangan');
    expect(html).toContain('Link Publik');
    expect(html).toContain(
      'Bagikan untuk melihat detail undangan. Tidak memuat RSVP atau ucapan tamu.',
    );
    expect(html).toContain('href="/raka-nadia"');
    expect(html).toContain('Buka Link Publik');
    expect(html).toContain('Undangan Pribadi');
    expect(html).toContain(
      'Buat untuk setiap tamu agar mereka menerima sapaan personal, mengisi RSVP, dan meninggalkan ucapan.',
    );
    expect(html).toContain('Untuk menerima RSVP, tambahkan tamu lalu buat Undangan Pribadi.');
    expect(html).toContain(`href="/dashboard/${projectId}/guests"`);
    expect(html).not.toContain('/g/');
  });

  it('directs owners with guests but no active personal link to the existing Delivery Center flow', () => {
    const html = renderToStaticMarkup(
      <ProjectOverviewBootstrap
        projectId={projectId}
        readiness={{
          ...draftReadyReadiness,
          invitation: {
            hasPublishedSnapshot: true,
            hasUnpublishedChanges: false,
            hasVerifiedActivation: true,
            publishedSlug: 'raka-nadia',
            state: 'published',
          },
          guests: {
            activeGuestCount: 2,
            activePersonalLinkGuestCount: 0,
            guestsWithoutActivePersonalLinkCount: 2,
            whatsappAvailableCount: 1,
            whatsappUnavailableCount: 1,
          },
          primaryAction: {
            href: `/dashboard/${projectId}/delivery`,
            key: 'prepare_personal_invitations',
          },
        }}
      />,
    );

    expect(html).toContain(
      'Untuk menerima RSVP, buat Undangan Pribadi untuk setiap tamu sebelum membagikannya.',
    );
    expect(html).toContain('Buka Delivery Center');
    expect(html).toContain(`href="/dashboard/${projectId}/delivery"`);
  });

  it('keeps active personal invitations described as the RSVP and guestbook path', () => {
    const html = renderToStaticMarkup(
      <ProjectOverviewBootstrap
        projectId={projectId}
        readiness={{
          ...draftReadyReadiness,
          invitation: {
            hasPublishedSnapshot: true,
            hasUnpublishedChanges: false,
            hasVerifiedActivation: true,
            publishedSlug: 'raka-nadia',
            state: 'published',
          },
          guests: {
            activeGuestCount: 1,
            activePersonalLinkGuestCount: 1,
            guestsWithoutActivePersonalLinkCount: 0,
            whatsappAvailableCount: 1,
            whatsappUnavailableCount: 0,
          },
          primaryAction: { href: `/dashboard/${projectId}/delivery`, key: 'open_delivery_center' },
        }}
      />,
    );

    expect(html).toContain(
      'Undangan Pribadi aktif adalah tempat tamu menerima sapaan, mengisi RSVP, dan meninggalkan ucapan.',
    );
    expect(html).toContain('Buka Delivery Center');
  });

  it('uses neutral invitation-path copy in the project form instead of a hardcoded origin', () => {
    const html = renderToStaticMarkup(<ProjectSetupForm />);

    expect(html).toContain('Link undangan');
    expect(html).toContain('Bagian ini menjadi akhir tautan undangan.');
    expect(html).not.toContain('seraya.id');
  });

  it('keeps a missing saved draft in the truthful incomplete state', () => {
    const html = renderToStaticMarkup(
      <ProjectOverviewBootstrap
        projectId={projectId}
        readiness={{
          ...draftReadyReadiness,
          invitation: {
            hasPublishedSnapshot: false,
            hasUnpublishedChanges: false,
            hasVerifiedActivation: false,
            publishedSlug: null,
            state: 'draft_incomplete',
          },
          primaryAction: {
            href: `/dashboard/${projectId}/invitation`,
            key: 'complete_invitation',
          },
        }}
      />,
    );

    expect(html).toContain('Undangan kalian sedang disusun');
    expect(html).toContain('Lengkapi undangan');
    expect(html).toContain(`href="/dashboard/${projectId}/invitation"`);
  });
});
