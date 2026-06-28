import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';

import { createGuestOperationsXlsx } from '../guest-operations-xlsx';

function excelJsBuffer(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return Buffer.from(copy.buffer) as unknown as Parameters<ExcelJS.Workbook['xlsx']['load']>[0];
}

function worksheetText(sheet: ExcelJS.Worksheet | undefined, columns: number) {
  return Array.from({ length: columns }, (_, index) => [
    sheet?.getRow(1).getCell(index + 1).text ?? '',
    sheet?.getRow(2).getCell(index + 1).text ?? '',
  ])
    .flat()
    .join('|');
}

describe('SRY-038 guest operations XLSX export', () => {
  it('exports only owner-operational guest columns and no personal capability material', async () => {
    const bytes = await createGuestOperationsXlsx([
      {
        display_name: 'Rani',
        group_label: 'Keluarga',
        id: 'guest-1',
        link_state: 'active',
        party_size: 3,
        rsvp_attendee_count: null,
        rsvp_status: 'pending',
        whatsapp_phone_e164: '+6281234567890',
      },
    ]);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(excelJsBuffer(bytes));
    const sheet = workbook.getWorksheet('Tamu');
    const values = worksheetText(sheet, 6);

    expect(values).toContain('Nama Tamu');
    expect(values).toContain('+6281234567890');
    expect(values).toContain('Aktif');
    expect(values).not.toContain('/g/');
    expect(values).not.toContain('token_hash');
    expect(values).not.toContain('token_ciphertext');
  });
});
