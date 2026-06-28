import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';

import { createRsvpResponseXlsx } from '../rsvp-response-xlsx';

function excelJsBuffer(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return Buffer.from(copy.buffer) as unknown as Parameters<ExcelJS.Workbook['xlsx']['load']>[0];
}

describe('SRY-039 Respons Tamu XLSX export', () => {
  it('exports RSVP follow-up state without personal capability, contact, or guestbook content', async () => {
    const bytes = await createRsvpResponseXlsx({
      guestbookGuestIds: new Set(['guest-2']),
      rows: [
        {
          displayName: 'Alya',
          groupLabel: 'Keluarga',
          guestId: 'guest-1',
          partySize: 2,
          rsvpAttendeeCount: null,
          rsvpStatus: 'pending',
          updatedAt: '2027-08-17T09:00:00.000Z',
        },
        {
          displayName: 'Bima',
          groupLabel: null,
          guestId: 'guest-2',
          partySize: 1,
          rsvpAttendeeCount: 1,
          rsvpStatus: 'attending',
          updatedAt: '2027-08-17T10:00:00.000Z',
        },
      ],
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(excelJsBuffer(bytes));
    const sheet = workbook.getWorksheet('Respons Tamu');
    const text = [1, 2, 3]
      .flatMap((row) =>
        Array.from({ length: 6 }, (_, column) => sheet?.getRow(row).getCell(column + 1).text ?? ''),
      )
      .join('|');

    expect(text).toContain('Status Tindak Lanjut');
    expect(text).toContain('Belum merespons RSVP');
    expect(text).toContain('Ada ucapan');
    expect(text).not.toContain('/g/');
    expect(text).not.toContain('token');
    expect(text).not.toContain('ciphertext');
    expect(text).not.toContain('WhatsApp');
  });
});
