import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

const { getDeliveryCenterMock, getOwnedProjectContextMock, getReadinessMock, notFoundMock } =
  vi.hoisted(() => ({
    getDeliveryCenterMock: vi.fn(),
    getOwnedProjectContextMock: vi.fn(),
    getReadinessMock: vi.fn(),
    notFoundMock: vi.fn(),
  }));

vi.mock('next/navigation', () => ({ notFound: notFoundMock }));
vi.mock('@/components/projects/guest-delivery-center', () => ({
  GuestDeliveryCenter: ({ projectId, rows }: { projectId: string; rows: unknown[] }) => (
    <div data-delivery-project-id={projectId}>{rows.length} rows</div>
  ),
}));
vi.mock('@/modules/auth/dashboard-request-context', () => ({
  getOwnedProjectContextForRequest: getOwnedProjectContextMock,
}));
vi.mock('@/modules/delivery/delivery.actions', () => ({
  copySelectedDeliveryWhatsAppNumbersAction: vi.fn(),
  prepareMissingPersonalGuestLinksForDeliveryAction: vi.fn(),
  preparePersonalGuestLinkForDeliveryAction: vi.fn(),
  reaccessPersonalGuestLinkForDeliveryAction: vi.fn(),
}));
vi.mock('@/modules/delivery/delivery.service', () => ({
  getGuestDeliveryCenterForVerifiedProject: getDeliveryCenterMock,
}));
vi.mock('@/modules/readiness', () => ({
  getWeddingReadinessForRequest: getReadinessMock,
}));

import DeliveryCenterPage, {
  dynamic,
  fetchCache,
  revalidate,
} from '@/app/(dashboard)/dashboard/[projectId]/delivery/page';

const projectId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const project = { id: projectId };

function createReadiness(published = true) {
  return {
    invitation: { hasPublishedSnapshot: published },
    responses: { hasActivePersonalLinks: false },
  };
}

describe('SRY-031 private Delivery Center route', () => {
  beforeEach(() => {
    getDeliveryCenterMock.mockReset();
    getOwnedProjectContextMock.mockReset().mockResolvedValue(project);
    getReadinessMock.mockReset().mockResolvedValue(createReadiness());
    notFoundMock.mockReset();
    notFoundMock.mockImplementation(() => {
      throw new Error('NEXT_NOT_FOUND');
    });
  });

  it('is private dynamic no-store and renders only verified owner delivery data', async () => {
    getDeliveryCenterMock.mockResolvedValue({
      isPublished: true,
      project,
      rows: [
        {
          displayName: 'Keluarga Budi',
          groupLabel: null,
          guestId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          maskedWhatsAppNumber: '+62••••7890',
          personalLinkReaccessState: 'recoverable',
          personalLinkState: 'active',
          rsvpStatus: 'pending',
          whatsappAvailability: 'available',
        },
      ],
      summary: {
        activeGuestCount: 1,
        needsLinkUpdateCount: 0,
        needsWhatsAppCount: 0,
        noPersonalInvitationCount: 0,
        readyToDistributeCount: 1,
      },
    });

    const page = await DeliveryCenterPage({ params: Promise.resolve({ projectId }) });
    const html = renderToStaticMarkup(page);

    expect(dynamic).toBe('force-dynamic');
    expect(revalidate).toBe(0);
    expect(fetchCache).toBe('force-no-store');
    expect(getReadinessMock).toHaveBeenCalledWith(projectId);
    expect(getOwnedProjectContextMock).toHaveBeenCalledWith(projectId);
    expect(getDeliveryCenterMock).toHaveBeenCalledWith(project);
    expect(html).toContain(`data-delivery-project-id="${projectId}"`);
    expect(html).toContain('1 rows');
  });

  it('keeps direct unpublished owner access blocked before any delivery or link-preparation read', async () => {
    getReadinessMock.mockResolvedValue(createReadiness(false));

    const page = await DeliveryCenterPage({ params: Promise.resolve({ projectId }) });
    const html = renderToStaticMarkup(page);

    expect(html).toContain('Bagikan tersedia setelah undangan diterbitkan');
    expect(html).toContain(
      'Terbitkan versi undangan yang sudah kalian setujui sebelum menyiapkan undangan pribadi.',
    );
    expect(getOwnedProjectContextMock).not.toHaveBeenCalled();
    expect(getDeliveryCenterMock).not.toHaveBeenCalled();
  });

  it('uses generic unavailable behavior for foreign or soft-deleted project readiness', async () => {
    getReadinessMock.mockRejectedValue(new ProjectAccessDeniedError());

    await expect(DeliveryCenterPage({ params: Promise.resolve({ projectId }) })).rejects.toThrow(
      'NEXT_NOT_FOUND',
    );
    expect(getDeliveryCenterMock).not.toHaveBeenCalled();
  });

  it('uses owner-scoped request readiness plus the existing delivery service without public or mutation dependencies', async () => {
    const source = await readFile(
      path.resolve(process.cwd(), 'src/app/(dashboard)/dashboard/[projectId]/delivery/page.tsx'),
      'utf8',
    );

    expect(source).toContain('getWeddingReadinessForRequest');
    expect(source).toContain('getOwnedProjectContextForRequest');
    expect(source).toContain('getGuestDeliveryCenterForVerifiedProject');
    expect(source).not.toContain('createServerSupabaseClient');
    expect(source).not.toContain('cookies(');
    expect(source).not.toContain('headers(');
    expect(source).not.toContain('published_invitation_snapshots');
    expect(source).not.toContain('guestbook');
    expect(source).not.toContain('rsvp');
    expect(source).not.toContain('revalidateTag');
  });
});
