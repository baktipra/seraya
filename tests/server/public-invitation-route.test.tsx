import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultInvitationDraftContent } from '@/modules/invitations/invitation-draft.defaults';

const { getPublicGalleryImagesMock, getPublicInvitationMock, notFoundMock } = vi.hoisted(() => ({
  getPublicGalleryImagesMock: vi.fn(),
  getPublicInvitationMock: vi.fn(),
  notFoundMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  notFound: notFoundMock,
}));

vi.mock('@/modules/publications/public-invitation.service', () => ({
  getPublicInvitationBySlug: getPublicInvitationMock,
}));

vi.mock('@/modules/media/public-media.service', () => ({
  getPublicGalleryImagesForCurrentSnapshot: getPublicGalleryImagesMock,
}));

import PublicInvitationPage, { dynamic, generateMetadata, revalidate } from '@/app/[slug]/page';

const snapshot = {
  created_at: '2026-06-20T00:00:00.000Z',
  draft_schema_version: 1,
  id: 'published-private-id',
  is_current: true,
  project_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  published_at: '2026-06-20T00:00:00.000Z',
  revision: 1,
  slug: 'raka-nadia',
  snapshot: {
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
  },
  template_id: 'roselle' as const,
};

describe('SRY-008 public invitation route', () => {
  it('declares the public snapshot route as static ISR output', () => {
    expect(dynamic).toBe('force-static');
    expect(revalidate).toBe(3600);
  });

  beforeEach(() => {
    getPublicGalleryImagesMock.mockReset();
    getPublicGalleryImagesMock.mockResolvedValue([]);
    getPublicInvitationMock.mockReset();
    notFoundMock.mockReset();
    notFoundMock.mockImplementation(() => {
      throw new Error('NEXT_NOT_FOUND');
    });
  });

  it('renders Roselle from a current snapshot without dashboard controls or internal metadata', async () => {
    getPublicInvitationMock.mockResolvedValue(snapshot);

    const page = await PublicInvitationPage({ params: Promise.resolve({ slug: 'raka-nadia' }) });
    const html = renderToStaticMarkup(page);

    expect(getPublicInvitationMock).toHaveBeenCalledWith('raka-nadia');
    expect(html).toContain('Raka &amp; Nadia');
    expect(html).toContain('17 Agustus 2027');
    expect(html).not.toContain('Kembali ke project');
    expect(html).not.toContain('Belum dipublikasikan');
    expect(html).not.toContain('published-private-id');
    expect(html).not.toContain('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
  });

  it('renders the template stored in the immutable published snapshot only', async () => {
    const publishedDraft = { ...snapshot.snapshot.draft, templateKey: 'laras' as const };
    getPublicInvitationMock.mockResolvedValue({
      ...snapshot,
      snapshot: { ...snapshot.snapshot, draft: publishedDraft },
      template_id: 'laras' as const,
    });

    const page = await PublicInvitationPage({ params: Promise.resolve({ slug: 'raka-nadia' }) });
    const html = renderToStaticMarkup(page);

    expect(html).toContain('data-template="laras"');
  });

  it('renders Amplop Digital only from the immutable published snapshot draft', async () => {
    const publishedDraft = {
      ...snapshot.snapshot.draft,
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
        lead: 'Terima kasih atas doa terbaik Anda.',
      },
    };

    getPublicInvitationMock.mockResolvedValue({
      ...snapshot,
      snapshot: { ...snapshot.snapshot, draft: publishedDraft },
    });

    const page = await PublicInvitationPage({ params: Promise.resolve({ slug: 'raka-nadia' }) });
    const html = renderToStaticMarkup(page);

    expect(html).toContain('Amplop Digital');
    expect(html).toContain('Bank Seraya');
    expect(html).toContain('Raka Pratama');
    expect(html).toContain('123456789012');
    expect(html).toContain('Salin nomor');
    expect(html).not.toContain('draft-only-bank-change');
  });

  it('maps snapshot gallery IDs only to the public Seraya media proxy', async () => {
    const imageId = '11111111-1111-4111-8111-111111111111';
    const draft = createDefaultInvitationDraftContent({
      default_timezone: 'Asia/Jakarta',
      event_date_primary: '2027-08-17',
      person_one_name: 'Raka',
      person_two_name: 'Nadia',
    });
    draft.gallery = { enabled: true, imageIds: [imageId] };
    getPublicInvitationMock.mockResolvedValue({
      ...snapshot,
      snapshot: { ...snapshot.snapshot, draft },
    });
    getPublicGalleryImagesMock.mockResolvedValue([
      { alt: 'Foto pasangan 1', id: imageId, src: `/media/${imageId}` },
    ]);

    const page = await PublicInvitationPage({ params: Promise.resolve({ slug: 'raka-nadia' }) });
    const html = renderToStaticMarkup(page);

    expect(getPublicGalleryImagesMock).toHaveBeenCalledWith([imageId]);
    expect(html).toContain(`src="/media/${imageId}"`);
    expect(html).not.toContain('/dashboard/media/');
    expect(html).not.toContain('projects/');
  });

  it('omits a snapshot gallery image when the current-public-media gate cannot resolve it', async () => {
    const imageId = '11111111-1111-4111-8111-111111111111';
    const draft = createDefaultInvitationDraftContent({
      default_timezone: 'Asia/Jakarta',
      event_date_primary: '2027-08-17',
      person_one_name: 'Raka',
      person_two_name: 'Nadia',
    });
    draft.gallery = { enabled: true, imageIds: [imageId] };
    getPublicInvitationMock.mockResolvedValue({
      ...snapshot,
      snapshot: { ...snapshot.snapshot, draft },
    });
    getPublicGalleryImagesMock.mockResolvedValue([]);

    const page = await PublicInvitationPage({ params: Promise.resolve({ slug: 'raka-nadia' }) });
    const html = renderToStaticMarkup(page);

    expect(html).not.toContain('<img');
    expect(html).not.toContain('Potret kami');
  });

  it('returns public not-found for draft-only, historical, and missing snapshots', async () => {
    getPublicInvitationMock.mockResolvedValue(null);
    await expect(
      PublicInvitationPage({ params: Promise.resolve({ slug: 'draft-only' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');

    getPublicInvitationMock.mockResolvedValue({ ...snapshot, is_current: false });
    await expect(
      PublicInvitationPage({ params: Promise.resolve({ slug: 'raka-nadia' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('marks public invitation metadata as non-indexable by default', async () => {
    getPublicInvitationMock.mockResolvedValue(snapshot);

    await expect(
      generateMetadata({ params: Promise.resolve({ slug: 'raka-nadia' }) }),
    ).resolves.toMatchObject({
      robots: { follow: false, index: false, noarchive: true },
      title: 'Raka & Nadia',
    });
  });

  it('keeps the public runtime snapshot-only and free from session/cookie dependencies', async () => {
    const testDirectory = path.dirname(fileURLToPath(import.meta.url));
    const routeSource = await readFile(
      path.resolve(testDirectory, '../../src/app/[slug]/page.tsx'),
      'utf8',
    );

    expect(routeSource).toContain('getPublicInvitationBySlug');
    expect(routeSource).toContain("export const dynamic = 'force-static';");
    expect(routeSource).toContain('export const revalidate = 3600;');
    expect(routeSource).not.toContain('getOwnedProjectInvitationOverview');
    expect(routeSource).not.toContain('invitation-draft.service');
    expect(routeSource).not.toContain('cookies(');
    expect(routeSource).not.toContain('createServerSupabaseClient');
  });
});
