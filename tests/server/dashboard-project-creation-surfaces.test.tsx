import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/projects/publish-invitation-controls', () => ({
  PublishInvitationControls: ({
    publishEligibility,
  }: {
    publishEligibility: { allowed: boolean };
  }) => (
    <div
      data-payment-publish-allowed={String(publishEligibility.allowed)}
      data-test-publish-controls="true"
    />
  ),
}));

vi.mock('@/components/projects/payment-activation-controls', () => ({
  PaymentActivationControls: () => <div data-test-payment-controls="true" />,
}));

import { DashboardEmptyState } from '@/components/dashboard/dashboard-empty-state';
import { DashboardProjectLauncher } from '@/components/dashboard/dashboard-project-launcher';
import { ProjectOverviewBootstrap } from '@/components/projects/project-overview-bootstrap';
import { ProjectSetupForm } from '@/components/projects/project-setup-form';
import { createDefaultInvitationDraftContent } from '@/modules/invitations/invitation-draft.defaults';

const paymentOverview = {
  configuration: {
    amountIdr: 99000,
    currency: 'IDR' as const,
    pricingVersion: 'v1' as const,
    productCode: 'invitation_activation' as const,
  },
  isConfigured: true,
  payment: null,
  publishEligibility: { allowed: false, reason: 'payment_required' } as const,
};

const project = {
  account_id: '11111111-1111-1111-1111-111111111111',
  default_timezone: 'Asia/Jakarta',
  deleted_at: null,
  event_city: 'Jakarta',
  event_date_primary: '2027-08-17',
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  person_one_name: 'Raka',
  person_two_name: 'Nadia',
  slug: 'raka-nadia',
  status: 'draft',
};

describe('SRY-005 project creation dashboard surfaces', () => {
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
            id: project.id,
            person_one_name: 'Raka',
            person_two_name: 'Nadia',
            status: 'draft',
          },
        ]}
      />,
    );

    expect(html).toContain('Raka &amp; Nadia');
    expect(html).toContain('17 Agustus 2027');
    expect(html).toContain(`action="/dashboard/${project.id}"`);
  });

  it('renders stored draft readiness without exposing raw JSON and keeps completion coming soon', () => {
    const html = renderToStaticMarkup(
      <ProjectOverviewBootstrap
        guestCount={12}
        draft={{
          content: createDefaultInvitationDraftContent(project),
          created_at: '2026-06-20T00:00:00.000Z',
          deleted_at: null,
          id: 'draft-id',
          project_id: project.id,
          schema_version: 1,
          updated_at: '2026-06-20T00:00:00.000Z',
        }}
        paymentOverview={paymentOverview}
        publication={null}
        project={project}
      />,
    );

    expect(html).toContain('Undangan kalian sudah dibuat.');
    expect(html).toContain('Detail dasar undangan sudah siap.');
    expect(html).toContain('Kesiapan isi undangan');
    expect(html).toContain('Tautan undangan');
    expect(html).toContain('/raka-nadia');
    expect(html).not.toContain('seraya.id');
    expect(html).toContain('Jakarta');
    expect(html).toContain('Pratinjau undangan');
    expect(html).toContain(`action="/dashboard/${project.id}/preview"`);
    expect(html).toContain('Kelola galeri');
    expect(html).toContain(`href="/dashboard/${project.id}/gallery"`);
    expect(html).toContain('12 tamu tersimpan');
    expect(html).toContain('Kelola tamu');
    expect(html).toContain(`href="/dashboard/${project.id}/guests"`);
    expect(html).toContain('Ringkasan RSVP');
    expect(html).toContain('Lihat respons tamu dan jumlah orang yang terkonfirmasi hadir.');
    expect(html).toContain(`href="/dashboard/${project.id}/rsvp"`);
    expect(html).toContain('Ucapan &amp; Doa');
    expect(html).toContain('Lihat pesan yang dikirim tamu.');
    expect(html).toContain(`href="/dashboard/${project.id}/guestbook"`);
    expect(html).toContain('Edit undangan');
    expect(html).toContain(`href="/dashboard/${project.id}/invitation"`);
    expect(html).toContain('data-test-payment-controls');
    expect(html).toContain('data-payment-publish-allowed="false"');
    expect(html).toContain('disabled');
    expect(html).not.toContain('schema_version');
    expect(html).not.toContain('draft-id');
  });

  it('uses neutral invitation-path copy in the project form instead of a hardcoded origin', () => {
    const html = renderToStaticMarkup(<ProjectSetupForm />);

    expect(html).toContain('Link undangan');
    expect(html).toContain('Bagian ini menjadi akhir tautan undangan.');
    expect(html).not.toContain('seraya.id');
  });

  it('shows a safe recovery message when an active project has no readable draft', () => {
    const html = renderToStaticMarkup(
      <ProjectOverviewBootstrap
        guestCount={0}
        draft={null}
        paymentOverview={paymentOverview}
        publication={null}
        project={project}
      />,
    );

    expect(html).toContain('draft undangan belum tersedia');
    expect(html).toContain('Nama pasangan');
  });
});
