import { beforeEach, describe, expect, it, vi } from 'vitest';

const { AuthenticationRequiredErrorMock, exportXlsxMock } = vi.hoisted(() => ({
  AuthenticationRequiredErrorMock: class AuthenticationRequiredError extends Error {},
  exportXlsxMock: vi.fn(),
}));
vi.mock('@/modules/auth/current-user', () => ({
  AuthenticationRequiredError: AuthenticationRequiredErrorMock,
}));
vi.mock('@/modules/guests/guest.service', () => ({
  getGuestOperationsXlsxForCurrentUser: exportXlsxMock,
}));
vi.mock('@/modules/projects/project.policy', () => ({
  ProjectAccessDeniedError: class ProjectAccessDeniedError extends Error {},
}));

import { POST } from '@/app/(dashboard)/dashboard/[projectId]/guests/export-xlsx/route';

const projectId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const guestId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function request(ids = [guestId]) {
  return new Request(`http://localhost:3000/dashboard/${projectId}/guests/export-xlsx`, {
    body: JSON.stringify({ guestIds: ids }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });
}

describe('SRY-038 private guest XLSX export route', () => {
  beforeEach(() => exportXlsxMock.mockReset());

  it('returns a no-store owner XLSX attachment from selection IDs only', async () => {
    exportXlsxMock.mockResolvedValue(new Uint8Array([1, 2, 3]));
    const response = await POST(request(), { params: Promise.resolve({ projectId }) });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(response.headers.get('Content-Disposition')).toBe(
      'attachment; filename="seraya-daftar-tamu.xlsx"',
    );
    expect(response.headers.get('Cache-Control')).toBe('private, no-store, max-age=0');
    await expect(response.arrayBuffer()).resolves.toHaveProperty('byteLength', 3);
    expect(exportXlsxMock).toHaveBeenCalledWith({ guestIds: [guestId], projectId });
  });
});
