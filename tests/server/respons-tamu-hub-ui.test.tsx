import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@/design-system', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/design-system')>();
  return { ...actual, useToast: () => ({ toast: vi.fn() }) };
});

import {
  filterRsvpResponseRows,
  GuestResponseWorkspace,
} from '@/components/projects/guest-response-workspace';
import type {
  RsvpAnalyticsViewModel,
  RsvpResponseRow,
} from '@/modules/guests/rsvp-analytics.types';

const projectId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

const responseRows: RsvpResponseRow[] = [
  {
    displayName: 'Alya',
    groupLabel: 'Keluarga',
    guestId: 'guest-1',
    partySize: 6,
    rsvpAttendeeCount: 2,
    rsvpStatus: 'attending',
    updatedAt: '2027-08-17T09:00:00.000Z',
  },
  {
    displayName: 'Bima',
    groupLabel: 'Teman sekolah',
    guestId: 'guest-2',
    partySize: 3,
    rsvpAttendeeCount: null,
    rsvpStatus: 'pending',
    updatedAt: '2027-08-17T10:00:00.000Z',
  },
  {
    displayName: 'Citra',
    groupLabel: null,
    guestId: 'guest-3',
    partySize: 2,
    rsvpAttendeeCount: null,
    rsvpStatus: 'declined',
    updatedAt: '2027-08-17T11:00:00.000Z',
  },
];

const analytics: RsvpAnalyticsViewModel = {
  activeGuestCount: 3,
  attendingCountUnknownGuestCount: 0,
  attendingGuestCount: 1,
  confirmedAttendeeCount: 2,
  declinedGuestCount: 1,
  invitedPeopleCount: 11,
  pendingGuestCount: 1,
  pendingGuests: [{ displayName: 'Bima' }],
  respondedCount: 2,
  respondedPercentage: 67,
  responseRows,
};

describe('SRY-040 Respons Tamu hub UI', () => {
  it('renders the canonical header, global RSVP summary, RSVP-only controls, compact table, and no delivery actions', () => {
    const html = renderToStaticMarkup(
      <GuestResponseWorkspace
        analytics={analytics}
        entries={[]}
        projectId={projectId}
        timezone="Asia/Jakarta"
      />,
    );

    expect(html).toContain('id="response-hub-title">Respons &amp; ucapan</h1>');
    expect(html).toContain(
      'Pantau konfirmasi kehadiran, jumlah rombongan, dan ucapan tamu dalam satu tempat.',
    );
    expect(html).toContain('aria-label="Ringkasan status RSVP"');
    for (const label of ['Hadir', 'Tidak hadir', 'Belum merespons', 'Rombongan hadir']) {
      expect(html).toContain(label);
    }
    for (const filter of ['Semua respons', 'Belum merespons', 'Hadir', 'Tidak hadir']) {
      expect(html).toContain(filter);
    }
    for (const header of ['Tamu', 'Grup', 'Status RSVP', 'Rombongan', 'Diperbarui']) {
      expect(html).toContain(header);
    }
    expect(html).toContain('role="tablist"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('Export XLSX');
    for (const forbidden of [
      'Copy',
      'WhatsApp',
      'Siapkan Undangan Pribadi',
      'Buat ulang',
      'Regenerate',
      'Nonaktifkan',
      'Hapus tamu',
      'Kirim pesan',
    ]) {
      expect(html).not.toContain(forbidden);
    }
  });

  it('uses actual attendance data only and makes an incomplete total explicit', () => {
    const html = renderToStaticMarkup(
      <GuestResponseWorkspace
        analytics={{
          ...analytics,
          attendingCountUnknownGuestCount: 1,
          confirmedAttendeeCount: 2,
        }}
        entries={[]}
        projectId={projectId}
        timezone="Asia/Jakarta"
      />,
    );

    expect(html).toContain('Rombongan hadir');
    expect(html).toContain('Belum lengkap');
    expect(html).toContain('2 orang terkonfirmasi; 1 RSVP hadir belum mencantumkan jumlah.');
    expect(html).not.toContain('6 orang');
  });

  it('renders the no-guest handoff and the no-response notice without a delivery CTA', () => {
    const noGuestHtml = renderToStaticMarkup(
      <GuestResponseWorkspace
        analytics={{
          ...analytics,
          activeGuestCount: 0,
          pendingGuestCount: 0,
          responseRows: [],
        }}
        entries={[]}
        projectId={projectId}
        timezone="Asia/Jakarta"
      />,
    );
    const noResponseHtml = renderToStaticMarkup(
      <GuestResponseWorkspace
        analytics={{
          ...analytics,
          attendingGuestCount: 0,
          declinedGuestCount: 0,
          pendingGuestCount: 3,
          respondedCount: 0,
          responseRows: responseRows.map((row) => ({
            ...row,
            rsvpAttendeeCount: null,
            rsvpStatus: 'pending' as const,
          })),
        }}
        entries={[]}
        projectId={projectId}
        timezone="Asia/Jakarta"
      />,
    );

    expect(noGuestHtml).toContain('Belum ada tamu untuk dipantau.');
    expect(noGuestHtml).toContain(
      'Tambahkan daftar tamu terlebih dahulu agar Anda dapat menerima RSVP.',
    );
    expect(noGuestHtml).toContain(`href="/dashboard/${projectId}/guests"`);
    expect(noGuestHtml).toContain('Buka Tamu');
    expect(noResponseHtml).toContain('Belum ada respons masuk.');
    expect(noResponseHtml).toContain(
      'Respons akan muncul ketika tamu mengisi kehadiran melalui Undangan Pribadi.',
    );
    expect(noResponseHtml).not.toContain(`/dashboard/${projectId}/delivery`);
  });

  it('filters only by RSVP status and searches guest name or group without selection state', () => {
    expect(filterRsvpResponseRows(responseRows, 'all', '')).toHaveLength(3);
    expect(filterRsvpResponseRows(responseRows, 'pending', '')).toEqual([
      expect.objectContaining({ displayName: 'Bima' }),
    ]);
    expect(filterRsvpResponseRows(responseRows, 'attending', 'keluarga')).toEqual([
      expect.objectContaining({ displayName: 'Alya' }),
    ]);
    expect(filterRsvpResponseRows(responseRows, 'declined', 'citra')).toEqual([
      expect.objectContaining({ displayName: 'Citra' }),
    ]);
    expect(filterRsvpResponseRows(responseRows, 'attending', 'teman')).toEqual([]);
  });

  it('renders Ucapan newest-first, includes available group/timestamp, and keeps the empty state personal without moderation', () => {
    const populatedHtml = renderToStaticMarkup(
      <GuestResponseWorkspace
        analytics={analytics}
        entries={[
          {
            createdAt: '2027-08-17T11:00:00.000Z',
            groupLabel: 'Teman',
            guestDisplayName: 'Citra',
            guestId: 'guest-3',
            id: 'entry-new',
            message: 'Semoga bahagia selalu.',
            updatedAt: '2027-08-17T11:00:00.000Z',
          },
          {
            createdAt: '2027-08-17T09:00:00.000Z',
            groupLabel: null,
            guestDisplayName: 'Alya',
            guestId: 'guest-1',
            id: 'entry-old',
            message: 'Doa terbaik untuk kalian.',
            updatedAt: '2027-08-17T09:00:00.000Z',
          },
        ]}
        initialTab="guestbook"
        projectId={projectId}
        timezone="Asia/Jakarta"
      />,
    );
    const emptyHtml = renderToStaticMarkup(
      <GuestResponseWorkspace
        analytics={analytics}
        entries={[]}
        initialTab="guestbook"
        projectId={projectId}
        timezone="Asia/Jakarta"
      />,
    );

    expect(populatedHtml.indexOf('Citra')).toBeLessThan(populatedHtml.indexOf('Alya'));
    expect(populatedHtml).toContain('Teman');
    expect(populatedHtml).toContain('Dikirim');
    expect(populatedHtml).not.toContain('Hapus ucapan');
    expect(emptyHtml).toContain('Belum ada ucapan dari tamu.');
    expect(emptyHtml).toContain(
      'Ucapan akan muncul di sini setelah tamu mengirimkannya melalui Undangan Pribadi.',
    );
  });

  it('keeps keyboard tabs and the response workspace free from messaging, lifecycle, and destructive controls', async () => {
    const source = await readFile(
      path.resolve(process.cwd(), 'src/components/projects/guest-response-workspace.tsx'),
      'utf8',
    );
    const guestbookSource = await readFile(
      path.resolve(process.cwd(), 'src/components/projects/guestbook-dashboard.tsx'),
      'utf8',
    );

    expect(source).toContain('onKeyDown={handleTabKeyDown}');
    expect(source).toContain("['ArrowLeft', 'ArrowRight', 'Home', 'End']");
    expect(source).not.toContain('guestbookGuestIds');
    expect(source).not.toContain('type ResponseFilter =');
    expect(guestbookSource).not.toContain('removeGuestbookEntryAction');
    expect(guestbookSource).not.toContain('Hapus ucapan');
  });
});
