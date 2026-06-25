import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultInvitationDraftContent } from '@/modules/invitations/invitation-draft.defaults';

const { getPersonalGuestInvitationMock, getPublicGalleryImagesMock, notFoundMock } = vi.hoisted(
  () => ({
    getPersonalGuestInvitationMock: vi.fn(),
    getPublicGalleryImagesMock: vi.fn(),
    notFoundMock: vi.fn(),
  }),
);

vi.mock('next/navigation', () => ({ notFound: notFoundMock }));
vi.mock('@/modules/guest-links', () => ({
  getPersonalGuestInvitationByToken: getPersonalGuestInvitationMock,
}));
vi.mock('@/modules/media/public-media.service', () => ({
  getPublicGalleryImagesForCurrentSnapshot: getPublicGalleryImagesMock,
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
    expect(html).toContain('Raka &amp; Nadia');
    expect(html).not.toContain('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    expect(html).not.toContain('token_hash');
    expect(html).not.toContain('payment');
  });

  it('renders the same template stored in the published personal snapshot', async () => {
    const guestToken = randomBytes(32).toString('base64url');
    getPersonalGuestInvitationMock.mockResolvedValue({
      guestDisplayName: 'Keluarga Budi',
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

  it('does not render RSVP controls when the current immutable snapshot disables RSVP', async () => {
    const guestToken = randomBytes(32).toString('base64url');
    getPersonalGuestInvitationMock.mockResolvedValue({
      guestDisplayName: 'Keluarga Budi',
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
    expect(routeSource).toContain("export const dynamic = 'force-dynamic';");
    expect(routeSource).toContain("export const fetchCache = 'force-no-store';");
    expect(routeSource).not.toContain('cookies(');
    expect(routeSource).not.toContain('createServerSupabaseClient');
    expect(routeSource).not.toContain('invitation-draft.service');
  });

  it('uses token-free noindex metadata', () => {
    expect(generateMetadata()).toEqual({
      robots: { follow: false, index: false, noarchive: true },
      title: 'Undangan pribadi',
    });
  });
});
