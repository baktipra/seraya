import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultInvitationDraftContent } from '@/modules/invitations/invitation-draft.defaults';
import { normalizePublishedInvitationSnapshot } from '@/modules/publications/published-invitation.schema';

const {
  getPersonalGuestInvitationMock,
  getPersonalGuestbookEntryMock,
  getPublicGalleryImagesMock,
  notFoundMock,
} = vi.hoisted(() => ({
  getPersonalGuestInvitationMock: vi.fn(),
  getPersonalGuestbookEntryMock: vi.fn(),
  getPublicGalleryImagesMock: vi.fn(),
  notFoundMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({ notFound: notFoundMock }));
vi.mock('@/modules/guest-links', () => ({
  getPersonalGuestInvitationByToken: getPersonalGuestInvitationMock,
}));
vi.mock('@/modules/media/public-media.service', () => ({
  getPublicGalleryImagesForCurrentSnapshot: getPublicGalleryImagesMock,
}));
vi.mock('@/modules/guestbook', () => ({
  getPersonalGuestbookEntryByToken: getPersonalGuestbookEntryMock,
}));

import PersonalGuestInvitationPage, {
  dynamic,
  fetchCache,
  generateMetadata,
  revalidate,
} from '@/app/[slug]/g/[guestToken]/page';

const snapshot = {
  draft: createDefaultInvitationDraftContent({
    default_timezone: 'Asia/Jakarta',
    event_date_primary: '2027-08-17',
    person_one_name: 'Raka',
    person_two_name: 'Nadia',
  }),
  project: {
    eventCity: 'Jakarta',
    eventDatePrimary: '2027-08-17',
    slug: 'raka-nadia',
    timezone: 'Asia/Jakarta',
  },
};

describe('SRY-013 personal guest invitation route', () => {
  beforeEach(() => {
    getPersonalGuestInvitationMock.mockReset();
    getPersonalGuestbookEntryMock.mockReset();
    getPersonalGuestbookEntryMock.mockResolvedValue(null);
    getPublicGalleryImagesMock.mockReset();
    getPublicGalleryImagesMock.mockResolvedValue([]);
    notFoundMock.mockReset();
    notFoundMock.mockImplementation(() => {
      throw new Error('NEXT_NOT_FOUND');
    });
  });

  it('is dynamic and no-store rather than a personalized variant of the public ISR route', () => {
    expect(dynamic).toBe('force-dynamic');
    expect(revalidate).toBe(0);
    expect(fetchCache).toBe('force-no-store');
  });

  it('renders the current snapshot with only the linked guest greeting and RSVP controls', async () => {
    const guestToken = randomBytes(32).toString('base64url');
    getPersonalGuestInvitationMock.mockResolvedValue({
      guestDisplayName: 'Keluarga Budi',
      partySize: 4,
      rsvpAttendeeCount: null,
      rsvpStatus: 'pending',
      snapshot,
      templateId: 'roselle',
    });

    const page = await PersonalGuestInvitationPage({
      params: Promise.resolve({ guestToken, slug: 'raka-nadia' }),
    });
    const html = renderToStaticMarkup(page);

    expect(getPersonalGuestInvitationMock).toHaveBeenCalledWith({
      slug: 'raka-nadia',
      token: guestToken,
    });
    expect(html).toContain('Untuk Keluarga Budi');
    expect(html).toContain('Status saat ini:');
    expect(html).toContain('Hadir');
    expect(html).toContain('Tidak hadir');
    expect(html).toContain('Undangan ini berlaku untuk maksimal 4 orang.');
    expect(html).toContain('Jumlah orang yang hadir');
    expect(html).toContain('Raka &amp; Nadia');
    expect(html).toContain('Ucapan &amp; Doa');
    expect(html).toContain('Kirim ucapan');
    expect(getPersonalGuestbookEntryMock).toHaveBeenCalledWith({
      slug: 'raka-nadia',
      token: guestToken,
    });
    expect(html).not.toContain('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    expect(html).not.toContain('token_hash');
    expect(html).not.toContain('payment');
  });

  it('renders the same template stored in the published personal snapshot', async () => {
    const guestToken = randomBytes(32).toString('base64url');
    getPersonalGuestInvitationMock.mockResolvedValue({
      guestDisplayName: 'Keluarga Budi',
      partySize: 4,
      rsvpAttendeeCount: null,
      rsvpStatus: 'pending',
      snapshot: {
        ...snapshot,
        draft: { ...snapshot.draft, templateKey: 'aruna' },
      },
      templateId: 'aruna',
    });

    const page = await PersonalGuestInvitationPage({
      params: Promise.resolve({ guestToken, slug: 'raka-nadia' }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain('data-template="aruna"');
  });

  it('renders a legacy personal snapshot without Amplop Digital', async () => {
    const guestToken = randomBytes(32).toString('base64url');
    const legacyDraft = { ...snapshot.draft };
    delete (legacyDraft as Partial<typeof legacyDraft>).digitalGift;
    const normalizedLegacySnapshot = normalizePublishedInvitationSnapshot({
      ...snapshot,
      draft: legacyDraft,
    });
    getPersonalGuestInvitationMock.mockResolvedValue({
      guestDisplayName: 'Keluarga Budi',
      partySize: 4,
      rsvpAttendeeCount: null,
      rsvpStatus: 'pending',
      snapshot: normalizedLegacySnapshot,
      templateId: 'roselle',
    });

    const page = await PersonalGuestInvitationPage({
      params: Promise.resolve({ guestToken, slug: 'raka-nadia' }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain('Untuk Keluarga Budi');
    expect(html).toContain('Raka &amp; Nadia');
    expect(html).not.toContain('Amplop Digital');
    expect(html).not.toContain('Salin nomor');
  });

  it('renders the same immutable published schedule for the personalized capability, with no guest fields in schedule output', async () => {
    const guestToken = randomBytes(32).toString('base64url');
    const personalDraft = structuredClone(snapshot.draft);
    const first = personalDraft.eventSchedule.events[0]!;
    personalDraft.eventSchedule.events = [
      {
        ...first,
        mapsUrl: 'https://maps.example.test/akad',
        title: 'Akad Nikah',
        venueAddress: 'Jalan Mawar 1',
        venueName: 'Masjid Seraya',
      },
      {
        ...first,
        date: '2027-08-18',
        endTime: null,
        id: '11111111-1111-4111-8111-111111111111',
        mapsUrl: null,
        startTime: '19:00',
        title: 'Resepsi',
        venueAddress: null,
        venueName: null,
      },
    ];
    getPersonalGuestInvitationMock.mockResolvedValue({
      guestDisplayName: 'Keluarga Budi',
      partySize: 4,
      rsvpAttendeeCount: null,
      rsvpStatus: 'pending',
      snapshot: { ...snapshot, draft: personalDraft },
      templateId: 'roselle',
    });

    const html = renderToStaticMarkup(
      await PersonalGuestInvitationPage({
        params: Promise.resolve({ guestToken, slug: 'raka-nadia' }),
      }),
    );

    expect(html).toContain('Akad Nikah');
    expect(html).toContain('Resepsi');
    expect(html.indexOf('Akad Nikah')).toBeLessThan(html.indexOf('Resepsi'));
    expect(html).toContain('Masjid Seraya');
    expect(html).toContain('href="https://maps.example.test/akad"');
    expect(html).not.toContain('party_size');
    expect(html).not.toContain('rsvp_attendee_count');
  });

  it('keeps the personalized schedule immutable until the service returns a replacement published snapshot', async () => {
    const guestToken = randomBytes(32).toString('base64url');
    const publishedDraft = structuredClone(snapshot.draft);
    publishedDraft.eventSchedule.events = [
      {
        ...publishedDraft.eventSchedule.events[0]!,
        title: 'Akad Nikah',
        venueName: 'Masjid Seraya',
      },
    ];
    const republishedDraft = structuredClone(publishedDraft);
    republishedDraft.eventSchedule.events = [
      {
        ...republishedDraft.eventSchedule.events[0]!,
        title: 'Resepsi Baru',
        venueName: 'Balai Seraya',
      },
    ];

    getPersonalGuestInvitationMock.mockResolvedValue({
      guestDisplayName: 'Keluarga Budi',
      partySize: 4,
      rsvpAttendeeCount: null,
      rsvpStatus: 'pending',
      snapshot: { ...snapshot, draft: publishedDraft },
      templateId: 'roselle',
    });
    const firstRender = renderToStaticMarkup(
      await PersonalGuestInvitationPage({
        params: Promise.resolve({ guestToken, slug: 'raka-nadia' }),
      }),
    );

    expect(firstRender).toContain('Akad Nikah');
    expect(firstRender).toContain('Masjid Seraya');
    expect(firstRender).not.toContain('Resepsi Baru');

    getPersonalGuestInvitationMock.mockResolvedValue({
      guestDisplayName: 'Keluarga Budi',
      partySize: 4,
      rsvpAttendeeCount: null,
      rsvpStatus: 'pending',
      snapshot: { ...snapshot, draft: republishedDraft },
      templateId: 'roselle',
    });
    const republishedRender = renderToStaticMarkup(
      await PersonalGuestInvitationPage({
        params: Promise.resolve({ guestToken, slug: 'raka-nadia' }),
      }),
    );

    expect(republishedRender).toContain('Resepsi Baru');
    expect(republishedRender).toContain('Balai Seraya');
    expect(republishedRender).not.toContain('Masjid Seraya');
  });

  it('renders Amplop Digital from the same published personal snapshot only', async () => {
    const guestToken = randomBytes(32).toString('base64url');
    getPersonalGuestInvitationMock.mockResolvedValue({
      guestDisplayName: 'Keluarga Budi',
      partySize: 4,
      rsvpAttendeeCount: null,
      rsvpStatus: 'pending',
      snapshot: {
        ...snapshot,
        draft: {
          ...snapshot.draft,
          digitalGift: {
            accounts: [
              {
                accountHolder: 'Raka Pratama',
                accountNumber: '123456789012',
                id: '11111111-1111-4111-8111-111111111111',
                providerName: 'Bank Seraya',
              },
            ],
            enabled: true,
            heading: 'Amplop Digital',
            lead: null,
          },
        },
      },
      templateId: 'roselle',
    });

    const page = await PersonalGuestInvitationPage({
      params: Promise.resolve({ guestToken, slug: 'raka-nadia' }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain('Amplop Digital');
    expect(html).toContain('Bank Seraya');
    expect(html).toContain('Raka Pratama');
    expect(html).toContain('123456789012');
    expect(html).toContain('Salin nomor');
    expect(html).not.toContain('token_hash');
  });

  it('does not render RSVP controls when the current immutable snapshot disables RSVP', async () => {
    const guestToken = randomBytes(32).toString('base64url');
    getPersonalGuestInvitationMock.mockResolvedValue({
      guestDisplayName: 'Keluarga Budi',
      partySize: 4,
      rsvpAttendeeCount: 2,
      rsvpStatus: 'attending',
      snapshot: {
        ...snapshot,
        draft: {
          ...snapshot.draft,
          rsvp: { ...snapshot.draft.rsvp, enabled: false },
        },
      },
      templateId: 'roselle',
    });

    const page = await PersonalGuestInvitationPage({
      params: Promise.resolve({ guestToken, slug: 'raka-nadia' }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).not.toContain('Konfirmasi kehadiran');
    expect(html).not.toContain('Status saat ini:');
  });

  it('renders accessible RSVP success feedback after a valid personal submission', async () => {
    const guestToken = randomBytes(32).toString('base64url');
    getPersonalGuestInvitationMock.mockResolvedValue({
      guestDisplayName: 'Keluarga Budi',
      partySize: 4,
      rsvpAttendeeCount: 2,
      rsvpStatus: 'attending',
      snapshot,
      templateId: 'roselle',
    });

    const page = await PersonalGuestInvitationPage({
      params: Promise.resolve({ guestToken, slug: 'raka-nadia' }),
      searchParams: Promise.resolve({ rsvp: 'success' }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain('Konfirmasi kehadiran kalian sudah disimpan.');
    expect(html).toContain('role="status"');
  });

  it('renders only the current guest’s own saved guestbook message and success feedback', async () => {
    const guestToken = randomBytes(32).toString('base64url');
    getPersonalGuestInvitationMock.mockResolvedValue({
      guestDisplayName: 'Keluarga Budi',
      partySize: 4,
      rsvpAttendeeCount: null,
      rsvpStatus: 'pending',
      snapshot,
      templateId: 'roselle',
    });
    getPersonalGuestbookEntryMock.mockResolvedValue({
      message: 'Semoga bahagia selalu',
      updatedAt: '2027-08-17T09:00:00.000Z',
    });

    const page = await PersonalGuestInvitationPage({
      params: Promise.resolve({ guestToken, slug: 'raka-nadia' }),
      searchParams: Promise.resolve({ guestbook: 'success' }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain('Semoga bahagia selalu');
    expect(html).toContain('Perbarui ucapan');
    expect(html).toContain('Ucapan dan doa kalian sudah disimpan.');
    expect(html).not.toContain('guestbook_entries');
    expect(html).not.toContain('guest_id');
  });

  it('uses one unavailable/not-found path for invalid, revoked, and mismatched capabilities', async () => {
    const guestToken = randomBytes(32).toString('base64url');
    getPersonalGuestInvitationMock.mockResolvedValue(null);

    await expect(
      PersonalGuestInvitationPage({ params: Promise.resolve({ guestToken, slug: 'raka-nadia' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('keeps this route free of session/cookie dependencies and out of public snapshot props', async () => {
    const testDirectory = path.dirname(fileURLToPath(import.meta.url));
    const routeSource = await readFile(
      path.resolve(testDirectory, '../../src/app/[slug]/g/[guestToken]/page.tsx'),
      'utf8',
    );

    expect(routeSource).toContain('getPersonalGuestInvitationByToken');
    expect(routeSource).toContain('getPersonalGuestbookEntryByToken');
    expect(routeSource).toContain("export const dynamic = 'force-dynamic';");
    expect(routeSource).toContain("export const fetchCache = 'force-no-store';");
    expect(routeSource).not.toContain('cookies(');
    expect(routeSource).not.toContain('createServerSupabaseClient');
    expect(routeSource).not.toContain('modules/readiness');
    expect(routeSource).not.toContain('invitation-draft.service');
    expect(routeSource).not.toContain('createServerSupabaseClient');
    expect(routeSource).toContain('personalSlots={{');
    expect(routeSource).toContain('surface="personal"');
    expect(routeSource).not.toContain('</InvitationTemplateRenderer>');
  });

  it('uses token-free noindex metadata', () => {
    expect(generateMetadata()).toEqual({
      robots: { follow: false, index: false, noarchive: true },
      title: 'Undangan pribadi',
    });
  });
});
