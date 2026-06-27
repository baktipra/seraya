import { beforeEach, describe, expect, it, vi } from 'vitest';

const { importGuestCsvMock, importGuestXlsxMock, revalidatePathMock } = vi.hoisted(() => ({
  importGuestCsvMock: vi.fn(),
  importGuestXlsxMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}));

vi.mock('next/cache', () => ({ revalidatePath: revalidatePathMock }));
vi.mock('../guest.service', () => ({
  importGuestCsvForCurrentUser: importGuestCsvMock,
  importGuestXlsxForCurrentUser: importGuestXlsxMock,
  isGuestRepositoryFailure: () => false,
}));

import { initialGuestImportActionState } from '../guest-import.action-state';
import { importGuestsCsvAction, importGuestsXlsxAction } from '../guest-import.actions';

const projectId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

function validImportFormData() {
  const formData = new FormData();
  formData.set('projectId', projectId);
  formData.set(
    'file',
    new File(['display_name,group_label,party_size\nRani,,1\n'], 'guests.csv', {
      type: 'text/csv',
    }),
  );
  return formData;
}

function validXlsxImportFormData() {
  const formData = new FormData();
  formData.set('projectId', projectId);
  formData.set(
    'file',
    new File(['PK\x03\x04fixture'], 'guests.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
  );
  return formData;
}

describe('SRY-014 guest CSV import server action', () => {
  beforeEach(() => {
    importGuestCsvMock.mockReset();
    importGuestXlsxMock.mockReset();
    revalidatePathMock.mockReset();
  });

  it('requires a project identifier and a real uploaded file before the service boundary', async () => {
    await expect(
      importGuestsCsvAction(initialGuestImportActionState, new FormData()),
    ).resolves.toEqual({ message: 'Pilih file CSV yang akan diimpor.', status: 'error' });

    expect(importGuestCsvMock).not.toHaveBeenCalled();
  });

  it('delegates CSV bytes to the server-owned service and revalidates only private guest surfaces', async () => {
    importGuestCsvMock.mockResolvedValue(2);
    const formData = validImportFormData();

    await expect(importGuestsCsvAction(initialGuestImportActionState, formData)).resolves.toEqual({
      message: '2 tamu berhasil ditambahkan.',
      status: 'success',
    });

    const call = importGuestCsvMock.mock.calls[0]?.[0];
    expect(call.projectId).toBe(projectId);
    expect(call.file).toBeInstanceOf(File);
    expect(revalidatePathMock).toHaveBeenCalledWith(`/dashboard/${projectId}`);
    expect(revalidatePathMock).toHaveBeenCalledWith(`/dashboard/${projectId}/guests`);
    expect(revalidatePathMock).toHaveBeenCalledTimes(2);
  });

  it('delegates XLSX bytes to the owner-scoped service, refreshes Delivery Center, and returns the manual preparation next step', async () => {
    importGuestXlsxMock.mockResolvedValue(3);

    await expect(
      importGuestsXlsxAction(initialGuestImportActionState, validXlsxImportFormData()),
    ).resolves.toEqual({
      message:
        '3 tamu berhasil ditambahkan. Buat Undangan Pribadi di Delivery Center sebelum membagikannya untuk RSVP dan ucapan.',
      status: 'success',
    });

    expect(importGuestXlsxMock).toHaveBeenCalledWith({
      file: expect.any(File),
      projectId,
    });
    expect(revalidatePathMock).toHaveBeenCalledWith(`/dashboard/${projectId}`);
    expect(revalidatePathMock).toHaveBeenCalledWith(`/dashboard/${projectId}/guests`);
    expect(revalidatePathMock).toHaveBeenCalledWith(`/dashboard/${projectId}/delivery`);
    expect(revalidatePathMock).toHaveBeenCalledTimes(3);
  });
});
