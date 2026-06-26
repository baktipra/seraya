import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

const { getDeliveryCenterMock, getOwnedProjectContextMock, notFoundMock } = vi.hoisted(() => ({
  getDeliveryCenterMock: vi.fn(),
  getOwnedProjectContextMock: vi.fn(),
  notFoundMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({ notFound: notFoundMock }));
vi.mock('@/components/projects/guest-delivery-center', () => ({
  GuestDeliveryCenter: ({
    isPublished,
    projectId,
    rows,
  }: {
    isPublished: boolean;
    projectId: string;
    rows: unknown[];
  }) => (
    <div data-delivery-published={String(isPublished)} data-delivery-project-id={projectId}>
      {rows.length} rows
    </div>
  ),
}));
vi.mock('@/modules/auth/dashboard-request-context', () => ({
  getOwnedProjectContextForRequest: getOwnedProjectContextMock,
}));
vi.mock('@/modules/delivery/delivery.actions', () => ({
  preparePersonalGuestLinkForDeliveryAction: vi.fn(),
}));
vi.mock('@/modules/delivery/delivery.service', () => ({
  getGuestDeliveryCenterForVerifiedProject: getDeliveryCenterMock,
}));

import DeliveryCenterPage, {
  dynamic,
  fetchCache,
  revalidate,
} from '@/app/(dashboard)/dashboard/[projectId]/delivery/page';

const projectId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const project = { id: projectId };

describe('SRY-029 private Delivery Center route', () => {
  beforeEach(() => {
    getDeliveryCenterMock.mockReset();
    getOwnedProjectContextMock.mockReset().mockResolvedValue(project);
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
          personalLinkState: 'active',
          whatsappAvailability: 'available',
        },
      ],
      summary: {
        activeGuestCount: 1,
        activePersonalLinkCount: 1,
        whatsappAvailableCount: 1,
        whatsappMissingCount: 0,
      },
    });

    const page = await DeliveryCenterPage({ params: Promise.resolve({ projectId }) });
    const html = renderToStaticMarkup(page);

    expect(dynamic).toBe('force-dynamic');
    expect(revalidate).toBe(0);
    expect(fetchCache).toBe('force-no-store');
    expect(getOwnedProjectContextMock).toHaveBeenCalledWith(projectId);
    expect(getDeliveryCenterMock).toHaveBeenCalledWith(project);
    expect(html).toContain('data-delivery-published="true"');
    expect(html).toContain(`data-delivery-project-id="${projectId}"`);
    expect(html).toContain('1 rows');
  });

  it('uses generic unavailable behavior for foreign or soft-deleted project context', async () => {
    getOwnedProjectContextMock.mockRejectedValue(new ProjectAccessDeniedError());

    await expect(DeliveryCenterPage({ params: Promise.resolve({ projectId }) })).rejects.toThrow(
      'NEXT_NOT_FOUND',
    );
    expect(getDeliveryCenterMock).not.toHaveBeenCalled();
  });

  it('uses request-local verified project context and avoids public/private unrelated loaders', async () => {
    const source = await readFile(
      path.resolve(process.cwd(), 'src/app/(dashboard)/dashboard/[projectId]/delivery/page.tsx'),
      'utf8',
    );

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
