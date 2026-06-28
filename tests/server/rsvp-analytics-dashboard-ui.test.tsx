import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { RsvpAnalyticsDashboard } from '@/components/projects/rsvp-analytics-dashboard';

const projectId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

const analytics = {
  activeGuestCount: 8,
  attendingCountUnknownGuestCount: 1,
  attendingGuestCount: 3,
  confirmedAttendeeCount: 6,
  declinedGuestCount: 2,
  invitedPeopleCount: 14,
  pendingGuestCount: 3,
  pendingGuests: [{ displayName: 'Alya' }, { displayName: 'Bima' }, { displayName: 'Citra' }],
  respondedCount: 5,
  respondedPercentage: 63,
  responseRows: [],
};

describe('SRY-028 RSVP attendance owner UI', () => {
  it('renders separate guest-group and explicit attendance metrics with uncertainty clarity', () => {
    const html = renderToStaticMarkup(
      <RsvpAnalyticsDashboard analytics={analytics} projectId={projectId} />,
    );

    expect(html).toContain('Ringkasan RSVP');
    expect(html).toContain('Lihat respons tamu dan jumlah orang yang terkonfirmasi hadir.');
    expect(html).toContain(
      'Rombongan adalah data tamu. Jumlah orang hadir hanya dihitung dari konfirmasi yang dikirim tamu.',
    );
    expect(html).toContain('Tamu terdaftar');
    expect(html).toContain('Orang diundang');
    expect(html).toContain('Rombongan hadir');
    expect(html).toContain('Orang terkonfirmasi hadir');
    expect(html).toContain('Belum merespons');
    expect(html).toContain('Sudah merespons');
    expect(html).toContain('5 dari 8 tamu');
    expect(html).toContain('63%');
    expect(html).toContain('1 rombongan hadir belum mencantumkan jumlah orang.');
    expect(html).toContain('Menunggu respons');
    expect(html).toContain('Alya');
    expect(html).toContain('Bima');
    expect(html).toContain('Citra');
    expect(html).toContain(`href="/dashboard/${projectId}/guests"`);
    expect(html).toContain('Kelola tamu');
    expect(html).not.toContain('Buat tautan');
    expect(html).not.toContain('Kirim WhatsApp');
    expect(html).not.toContain('Ubah RSVP');
    expect(html).not.toContain('token_hash');
  });

  it('renders clear no-guest and all-responded empty states', () => {
    const noGuestHtml = renderToStaticMarkup(
      <RsvpAnalyticsDashboard
        analytics={{
          activeGuestCount: 0,
          attendingCountUnknownGuestCount: 0,
          attendingGuestCount: 0,
          confirmedAttendeeCount: 0,
          declinedGuestCount: 0,
          invitedPeopleCount: 0,
          pendingGuestCount: 0,
          pendingGuests: [],
          respondedCount: 0,
          respondedPercentage: 0,
          responseRows: [],
        }}
        projectId={projectId}
      />,
    );
    const allRespondedHtml = renderToStaticMarkup(
      <RsvpAnalyticsDashboard
        analytics={{
          activeGuestCount: 2,
          attendingCountUnknownGuestCount: 0,
          attendingGuestCount: 2,
          confirmedAttendeeCount: 2,
          declinedGuestCount: 0,
          invitedPeopleCount: 2,
          pendingGuestCount: 0,
          pendingGuests: [],
          respondedCount: 2,
          respondedPercentage: 100,
          responseRows: [],
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
    expect(source).not.toContain('<form');
  });
});
