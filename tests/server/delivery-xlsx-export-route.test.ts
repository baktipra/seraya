import { beforeEach, describe, expect, it, vi } from 'vitest';

const { exportXlsxMock } = vi.hoisted(() => ({ exportXlsxMock: vi.fn() }));
vi.mock('@/modules/auth/current-user', () => ({
  AuthenticationRequiredError: class AuthenticationRequiredError extends Error {},
}));
vi.mock('@/modules/delivery/delivery.service', () => ({
  getDeliveryReadinessXlsxForCurrentUser: exportXlsxMock,
}));
vi.mock('@/modules/projects/project.policy', () => ({
  ProjectAccessDeniedError: class ProjectAccessDeniedError extends Error {},
}));

import { POST } from '@/app/(dashboard)/dashboard/[projectId]/delivery/export-xlsx/route';

const projectId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const guestId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

describe('SRY-038 private delivery XLSX export route', () => {
  beforeEach(() => exportXlsxMock.mockReset());

  it('returns private XLSX and passes only selection IDs to the owner-scoped service', async () => {
    exportXlsxMock.mockResolvedValue(new Uint8Array([1, 2, 3, 4]));
    const response = await POST(
      new Request(`http://localhost:3000/dashboard/${projectId}/delivery/export-xlsx`, {
        body: JSON.stringify({ guestIds: [guestId] }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      }),
      { params: Promise.resolve({ projectId }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Disposition')).toBe(
      'attachment; filename="seraya-delivery-center.xlsx"',
    );
    expect(response.headers.get('Cache-Control')).toBe('private, no-store, max-age=0');
    expect(exportXlsxMock).toHaveBeenCalledWith({ guestIds: [guestId], projectId });
  });
});
