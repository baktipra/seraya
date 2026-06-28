import { beforeEach, describe, expect, it, vi } from 'vitest';

const { exportMock } = vi.hoisted(() => ({ exportMock: vi.fn() }));
vi.mock('@/modules/auth/current-user', () => ({
  AuthenticationRequiredError: class AuthenticationRequiredError extends Error {},
}));
vi.mock('@/modules/guests/rsvp-analytics.service', () => ({
  getRsvpResponseXlsxForCurrentUser: exportMock,
}));
vi.mock('@/modules/projects/project.policy', () => ({
  ProjectAccessDeniedError: class ProjectAccessDeniedError extends Error {},
}));

import { GET } from '@/app/(dashboard)/dashboard/[projectId]/rsvp/export-xlsx/route';

const projectId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

describe('SRY-039 private RSVP XLSX export route', () => {
  beforeEach(() => exportMock.mockReset());

  it('returns owner-scoped private XLSX with no URL/token data in the route contract', async () => {
    exportMock.mockResolvedValue(new Uint8Array([1, 2, 3]));
    const response = await GET(
      new Request(`http://localhost:3000/dashboard/${projectId}/rsvp/export-xlsx`),
      { params: Promise.resolve({ projectId }) },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Disposition')).toBe(
      'attachment; filename="seraya-respons-tamu.xlsx"',
    );
    expect(response.headers.get('Cache-Control')).toBe('private, no-store, max-age=0');
    expect(exportMock).toHaveBeenCalledWith(projectId);
  });
});
