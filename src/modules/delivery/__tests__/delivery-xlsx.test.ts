import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';

import { createDeliveryReadinessXlsx } from '../delivery-xlsx';

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

describe('SRY-038 Delivery Center XLSX export', () => {
  it('exports readiness fields with owner phone values but never link capability material', async () => {
    const bytes = await createDeliveryReadinessXlsx([
      {
        displayName: 'Keluarga Budi',
        personalLinkState: 'active',
        rsvpStatus: 'attending',
        whatsappAvailability: 'available',
        whatsappPhoneE164: '+6281234567890',
      },
    ]);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(excelJsBuffer(bytes));
    const sheet = workbook.getWorksheet('Delivery Center');
    const values = worksheetText(sheet, 6);

    expect(values).toContain('Status Kesiapan');
    expect(values).toContain('+6281234567890');
    expect(values).toContain('Siap dibagikan');
    expect(values).not.toContain('/g/');
    expect(values).not.toContain('token_ciphertext');
    expect(values).not.toContain('token_key_version');
  });
});
