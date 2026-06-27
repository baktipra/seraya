import ExcelJS from 'exceljs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { templateMock } = vi.hoisted(() => ({ templateMock: vi.fn() }));

vi.mock('@/modules/auth/current-user', () => ({
  AuthenticationRequiredError: class AuthenticationRequiredError extends Error {},
}));
vi.mock('@/modules/guests/guest.service', () => ({
  getGuestImportXlsxTemplateForCurrentUser: templateMock,
}));
vi.mock('@/modules/projects/project.policy', () => ({
  ProjectAccessDeniedError: class ProjectAccessDeniedError extends Error {},
}));

import { AuthenticationRequiredError } from '@/modules/auth/current-user';
import { createGuestImportXlsxTemplate, GUEST_XLSX_HEADERS } from '@/modules/guests/guest-xlsx';
import { GET } from '@/app/(dashboard)/dashboard/[projectId]/guests/template/route';

const projectId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

function excelJsBuffer(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return Buffer.from(copy.buffer) as unknown as Parameters<ExcelJS.Workbook['xlsx']['load']>[0];
}

function request() {
  return new Request(`http://localhost:3000/dashboard/${projectId}/guests/template`);
}

describe('SRY-036 private guest XLSX template route', () => {
  beforeEach(() => {
    templateMock.mockReset();
  });

  it('returns a no-store owner XLSX attachment with the required Tamu sheet and Indonesian headers', async () => {
    templateMock.mockResolvedValue(await createGuestImportXlsxTemplate());

    const response = await GET(request(), { params: Promise.resolve({ projectId }) });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(excelJsBuffer(new Uint8Array(await response.arrayBuffer())));

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(response.headers.get('Content-Disposition')).toBe(
      'attachment; filename="seraya-template-daftar-tamu.xlsx"',
    );
    expect(response.headers.get('Cache-Control')).toBe('private, no-store, max-age=0');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(templateMock).toHaveBeenCalledWith(projectId);
    expect(workbook.worksheets).toHaveLength(1);
    expect(workbook.worksheets[0]?.name).toBe('Tamu');
    expect(
      GUEST_XLSX_HEADERS.map(
        (_, index) => workbook.worksheets[0]?.getRow(1).getCell(index + 1).value,
      ),
    ).toEqual([...GUEST_XLSX_HEADERS]);
  });

  it('does not disclose a template to unauthenticated or unauthorized callers', async () => {
    templateMock.mockRejectedValue(new AuthenticationRequiredError());

    const response = await GET(request(), { params: Promise.resolve({ projectId }) });

    expect(response.status).toBe(404);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store, max-age=0');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    await expect(response.text()).resolves.toBe('');
  });
});
