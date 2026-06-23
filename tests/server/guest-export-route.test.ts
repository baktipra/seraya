import { beforeEach, describe, expect, it, vi } from 'vitest';

const { exportCsvMock } = vi.hoisted(() => ({ exportCsvMock: vi.fn() }));

vi.mock('@/modules/auth/current-user', () => ({
  AuthenticationRequiredError: class AuthenticationRequiredError extends Error {},
}));
vi.mock('@/modules/guests/guest.service', () => ({
  getGuestDirectoryCsvForCurrentUser: exportCsvMock,
}));
vi.mock('@/modules/projects/project.policy', () => ({
  ProjectAccessDeniedError: class ProjectAccessDeniedError extends Error {},
}));

import { AuthenticationRequiredError } from '@/modules/auth/current-user';
import { GET } from '@/app/(dashboard)/dashboard/[projectId]/guests/export/route';

const projectId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

function request() {
  return new Request(`http://localhost:3000/dashboard/${projectId}/guests/export`);
}

describe('SRY-014 private guest CSV export route', () => {
  beforeEach(() => {
    exportCsvMock.mockReset();
  });

  it('returns a no-store owner-only CSV attachment with nosniff protection', async () => {
    exportCsvMock.mockResolvedValue('\ufeffdisplay_name,group_label,party_size\r\nRani,,1\r\n');

    const response = await GET(request(), { params: Promise.resolve({ projectId }) });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/csv; charset=utf-8');
    expect(response.headers.get('Content-Disposition')).toBe(
      'attachment; filename="seraya-guest-directory.csv"',
    );
    expect(response.headers.get('Cache-Control')).toBe('private, no-store, max-age=0');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    await expect(response.text()).resolves.toContain('display_name,group_label,party_size');
    expect(exportCsvMock).toHaveBeenCalledWith(projectId);
  });

  it('uses one unavailable response for unauthenticated and unknown/unauthorized projects', async () => {
    exportCsvMock.mockRejectedValue(new AuthenticationRequiredError());

    const response = await GET(request(), { params: Promise.resolve({ projectId }) });

    expect(response.status).toBe(404);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store, max-age=0');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    await expect(response.text()).resolves.toBe('');
  });
});
