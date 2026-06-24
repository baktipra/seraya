import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { RsvpAnalyticsDashboard } from '@/components/projects/rsvp-analytics-dashboard';

const projectId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

const analytics = {
  activeGuestCount: 8,
  attendingCount: 3,
  declinedCount: 2,
  pendingCount: 3,
  pendingGuests: [{ displayName: 'Alya' }, { displayName: 'Bima' }, { displayName: 'Citra' }],
  respondedCount: 5,
  respondedPercentage: 63,
};

describe('SRY-020 RSVP analytics owner UI', () => {
  it('renders factual current-state metrics, status breakdown, and a capped pending sample', () => {
    const html = renderToStaticMarkup(
      <RsvpAnalyticsDashboard analytics={analytics} projectId={projectId} />,
    );

    expect(html).toContain('Ringkasan RSVP');
    expect(html).toContain('Lihat gambaran respons tamu untuk undangan kalian.');
    expect(html).toContain('Semua angka menghitung data tamu, bukan total orang dalam rombongan.');
    expect(html).toContain('Tamu terdaftar');
    expect(html).toContain('Hadir');
    expect(html).toContain('Tidak hadir');
    expect(html).toContain('Belum merespons');
    expect(html).toContain('Sudah merespons');
    expect(html).toContain('5 dari 8 tamu');
    expect(html).toContain('63%');
    expect(html).toContain('Menunggu respons');
    expect(html).toContain('Alya');
    expect(html).toContain('Bima');
    expect(html).toContain('Citra');
    expect(html).toContain(`href="/dashboard/${projectId}/guests"`);
    expect(html).toContain('Kelola tamu');
    expect(html).not.toContain('Buat tautan');
    expect(html).not.toContain('Kirim WhatsApp');
    expect(html).not.toContain('Ubah RSVP');
    expect(html).not.toContain('party_size');
    expect(html).not.toContain('token_hash');
  });

  it('renders clear no-guest and all-responded empty states', () => {
    const noGuestHtml = renderToStaticMarkup(
      <RsvpAnalyticsDashboard
        analytics={{
          activeGuestCount: 0,
          attendingCount: 0,
          declinedCount: 0,
          pendingCount: 0,
          pendingGuests: [],
          respondedCount: 0,
          respondedPercentage: 0,
        }}
        projectId={projectId}
      />,
    );
    const allRespondedHtml = renderToStaticMarkup(
      <RsvpAnalyticsDashboard
        analytics={{
          activeGuestCount: 2,
          attendingCount: 2,
          declinedCount: 0,
          pendingCount: 0,
          pendingGuests: [],
          respondedCount: 2,
          respondedPercentage: 100,
        }}
        projectId={projectId}
      />,
    );

    expect(noGuestHtml).toContain('Belum ada tamu untuk diringkas.');
    expect(noGuestHtml).toContain('0%');
    expect(allRespondedHtml).toContain('Semua tamu sudah memberi respons.');
  });

  it('is a read-only presentation with no guest mutation action or private link data', async () => {
    const source = await readFile(
      path.resolve(process.cwd(), 'src/components/projects/rsvp-analytics-dashboard.tsx'),
      'utf8',
    );

    expect(source).not.toContain('useActionState');
    expect(source).not.toContain('guest.actions');
    expect(source).not.toContain('guest-link');
    expect(source).not.toContain('token_hash');
    expect(source).not.toContain('party_size');
    expect(source).not.toContain('<form');
  });
});
