import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

const { getDistributionCenterMock, getOwnedProjectContextMock, getPublicShareMock, notFoundMock } =
  vi.hoisted(() => ({
    getDistributionCenterMock: vi.fn(),
    getOwnedProjectContextMock: vi.fn(),
    getPublicShareMock: vi.fn(),
    notFoundMock: vi.fn(),
  }));

vi.mock('next/navigation', () => ({ notFound: notFoundMock }));
vi.mock('@/components/projects/native-guest-delivery-center', () => ({
  NativeGuestDeliveryCenter: ({ projectId, rows }: { projectId: string; rows: unknown[] }) => (
    <div data-delivery-project-id={projectId}>{rows.length} rows</div>
  ),
}));
vi.mock('@/components/projects/public-social-share-kit', () => ({
  PublicSocialShareKit: ({ projectId }: { projectId: string }) => (
    <div data-public-share-project-id={projectId}>public share</div>
  ),
}));
vi.mock('@/modules/auth/dashboard-request-context', () => ({
  getOwnedProjectContextForRequest: getOwnedProjectContextMock,
}));
vi.mock('@/modules/delivery/canonical-initial-contact.actions', () => ({
  recordCanonicalInitialContactAction: vi.fn(),
}));
vi.mock('@/modules/delivery/canonical-initial-handoff.actions', () => ({
  reaccessOrPrepareCanonicalInitialHandoffAction: vi.fn(),
}));
vi.mock('@/modules/delivery/delivery.actions', () => ({
  copySelectedDeliveryWhatsAppNumbersAction: vi.fn(),
  prepareMissingPersonalGuestLinksForDeliveryAction: vi.fn(),
  preparePersonalGuestLinkForDeliveryAction: vi.fn(),
}));
vi.mock('@/modules/delivery/delivery-distribution', () => ({
  deriveDeliveryDistribution: vi.fn(() => ({ canRecordContact: false })),
}));
vi.mock('@/modules/delivery/delivery-handoff.service', () => ({
  getGuestDistributionCenterForVerifiedProject: getDistributionCenterMock,
}));
vi.mock('@/modules/delivery/delivery-readiness', () => ({
  deriveDeliveryReadiness: vi.fn(() => ({
    canPrepareNewLink: false,
    isReadyToDistribute: false,
  })),
}));
vi.mock('@/modules/public-social-share/public-social-share.service', () => ({
  getPublicSocialShareForVerifiedProject: getPublicShareMock,
}));

import DeliveryCenterPage, {
  dynamic,
  fetchCache,
  revalidate,
} from '@/app/(dashboard)/dashboard/[projectId]/delivery/page';

const projectId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const project = { id: projectId };
const publicShare = { slug: 'raka-nadia' };

describe('SRY-031 private Delivery Center route', () => {
  beforeEach(() => {
    getDistributionCenterMock.mockReset();
    getOwnedProjectContextMock.mockReset().mockResolvedValue(project);
    getPublicShareMock.mockReset().mockResolvedValue(publicShare);
    notFoundMock.mockReset();
    notFoundMock.mockImplementation(() => {
      throw new Error('NEXT_NOT_FOUND');
    });
  });

  it('is private dynamic no-store and renders only verified owner delivery data', async () => {
    getDistributionCenterMock.mockResolvedValue({
      handoffSummary: {},
      project,
      rows: [
        {
          displayName: 'Keluarga Budi',
          guestId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        },
      ],
      summary: { activeGuestCount: 1 },
    });

    const page = await DeliveryCenterPage({ params: Promise.resolve({ projectId }) });
    const html = renderToStaticMarkup(page);

    expect(dynamic).toBe('force-dynamic');
    expect(revalidate).toBe(0);
    expect(fetchCache).toBe('force-no-store');
    expect(getOwnedProjectContextMock).toHaveBeenCalledWith(projectId);
    expect(getPublicShareMock).toHaveBeenCalledWith(project);
    expect(getDistributionCenterMock).toHaveBeenCalledWith(project);
    expect(html).toContain(`data-public-share-project-id="${projectId}"`);
    expect(html).toContain(`data-delivery-project-id="${projectId}"`);
    expect(html).toContain('1 rows');
  });

  it('keeps direct unpublished owner access blocked before any delivery read', async () => {
    getPublicShareMock.mockResolvedValue(null);

    const page = await DeliveryCenterPage({ params: Promise.resolve({ projectId }) });
    const html = renderToStaticMarkup(page);

    expect(html).toContain('Bagikan tersedia setelah undangan diterbitkan');
    expect(html).toContain(
      'Terbitkan versi undangan yang sudah kalian setujui sebelum menyiapkan pembagian manual untuk tamu atau membuat aset publik.',
    );
    expect(getOwnedProjectContextMock).toHaveBeenCalledWith(projectId);
    expect(getPublicShareMock).toHaveBeenCalledWith(project);
    expect(getDistributionCenterMock).not.toHaveBeenCalled();
  });

  it('uses generic unavailable behavior for foreign or soft-deleted projects', async () => {
    getOwnedProjectContextMock.mockRejectedValue(new ProjectAccessDeniedError());

    await expect(DeliveryCenterPage({ params: Promise.resolve({ projectId }) })).rejects.toThrow(
      'NEXT_NOT_FOUND',
    );
    expect(getPublicShareMock).not.toHaveBeenCalled();
    expect(getDistributionCenterMock).not.toHaveBeenCalled();
  });

  it('uses one verified project plus bounded public-share and distribution services', async () => {
    const source = await readFile(
      path.resolve(process.cwd(), 'src/app/(dashboard)/dashboard/[projectId]/delivery/page.tsx'),
      'utf8',
    );

    expect(source).toContain('getOwnedProjectContextForRequest');
    expect(source).toContain('getPublicSocialShareForVerifiedProject');
    expect(source).toContain('getGuestDistributionCenterForVerifiedProject');
    expect(source).toContain('PublicSocialShareKit');
    expect(source).not.toContain('getWeddingReadinessForRequest');
    expect(source).not.toContain('getWeddingReadinessForVerifiedProject');
    expect(source).not.toContain('createServerSupabaseClient');
    expect(source).not.toContain('cookies(');
    expect(source).not.toContain('headers(');
    expect(source).not.toContain('published_invitation_snapshots');
    expect(source).not.toContain('guestbook');
    expect(source).not.toContain('rsvp');
    expect(source).not.toContain('revalidateTag');
  });
});
