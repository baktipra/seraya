import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { DashboardEmptyState } from '@/components/dashboard/dashboard-empty-state';
import { DashboardProjectLauncher } from '@/components/dashboard/dashboard-project-launcher';
import { ProjectOverviewBootstrap } from '@/components/projects/project-overview-bootstrap';
import { ProjectSetupForm } from '@/components/projects/project-setup-form';
import type { WeddingReadinessV1 } from '@/modules/readiness';

const projectId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

function readiness(overrides: Partial<WeddingReadinessV1> = {}): WeddingReadinessV1 {
  return {
    identity: { coupleLabel: 'Raka & Nadia', templateKey: 'roselle' },
    invitation: {
      hasPublishedSnapshot: false,
      hasUnpublishedChanges: false,
      hasVerifiedActivation: false,
      publishedSlug: null,
      state: 'draft_incomplete',
    },
    guests: {
      activeGuestCount: 0,
      activePersonalLinkGuestCount: 0,
      guestsWithoutActivePersonalLinkCount: 0,
      whatsappAvailableCount: 0,
      whatsappUnavailableCount: 0,
    },
    primaryAction: { href: `/dashboard/${projectId}/invitation`, key: 'complete_invitation' },
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

describe('SRY-039 Project Compass surfaces', () => {
  it('keeps dashboard creation surfaces intact', () => {
    expect(renderToStaticMarkup(<DashboardEmptyState />)).toContain('Mulai buat undangan');
    expect(renderToStaticMarkup(<ProjectSetupForm />)).toContain('Link undangan');
    expect(
      renderToStaticMarkup(
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
      ),
    ).toContain('Raka &amp; Nadia');
  });

  it('renders Ringkasan as the editorial aggregate compass without guest-table actions', () => {
    const html = renderToStaticMarkup(
      <ProjectOverviewBootstrap projectId={projectId} readiness={readiness()} />,
    );
    expect(html).toContain('Draf belum lengkap');
    expect(html).toContain('Ringkasan kondisi proyek');
    expect(html).toContain('Langkah berikutnya');
    expect(html).toContain('Lengkapi isi undangan');
    expect(html).toContain('Tamu aktif');
    expect(html).not.toContain('<table');
    expect(html).not.toContain('Copy tautan');
    expect(html).not.toContain('Bagikan WhatsApp');
    expect(html).not.toContain('token_hash');
  });

  it('routes editorial attention to the current V3 workspace handoffs', () => {
    const html = renderToStaticMarkup(
      <ProjectOverviewBootstrap
        projectId={projectId}
        readiness={readiness({
          invitation: {
            hasPublishedSnapshot: true,
            hasUnpublishedChanges: true,
            hasVerifiedActivation: true,
            publishedSlug: 'raka-nadia',
            state: 'published_with_unpublished_changes',
          },
          guests: {
            activeGuestCount: 3,
            activePersonalLinkGuestCount: 1,
            guestsWithoutActivePersonalLinkCount: 2,
            whatsappAvailableCount: 1,
            whatsappUnavailableCount: 2,
          },
          primaryAction: {
            href: `/dashboard/${projectId}/delivery`,
            key: 'prepare_personal_invitations',
          },
          responses: {
            activeGuestbookCount: 0,
            attendingCount: 0,
            confirmedAttendeeCount: 0,
            declinedCount: 0,
            hasActivePersonalLinks: true,
            nonPendingRsvpCount: 1,
          },
        })}
      />,
    );
    expect(html).toContain(`href="/dashboard/${projectId}/invitation"`);
    expect(html).toContain(`href="/dashboard/${projectId}/invitation?task=publish"`);
    expect(html).toContain(`href="/dashboard/${projectId}/guests"`);
    expect(html).toContain(`href="/dashboard/${projectId}/rsvp"`);
    expect(html).toContain('Ada perubahan draf');
    expect(html).toContain('Sinkronkan versi tamu');
    expect(html).toContain('Siap dibagikan');
  });
});
