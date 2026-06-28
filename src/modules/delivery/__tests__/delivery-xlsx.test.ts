import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';

import { createDeliveryReadinessXlsx } from '../delivery-xlsx';

function excelJsBuffer(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return Buffer.from(copy.buffer) as unknown as Parameters<ExcelJS.Workbook['xlsx']['load']>[0];
}

function worksheetText(sheet: ExcelJS.Worksheet | undefined, rows: number, columns: number) {
  return Array.from({ length: rows }, (_, rowIndex) =>
    Array.from(
      { length: columns },
      (_, columnIndex) => sheet?.getRow(rowIndex + 1).getCell(columnIndex + 1).text ?? '',
    ),
  )
    .flat()
    .join('|');
}

describe('SRY-039A Delivery readiness XLSX export', () => {
  it('exports shared readiness and follow-up statuses without link capability material', async () => {
    const bytes = await createDeliveryReadinessXlsx([
      {
        displayName: 'Keluarga Budi',
        personalLinkReaccessState: 'recoverable',
        personalLinkState: 'active',
        rsvpStatus: 'attending',
        whatsappAvailability: 'available',
        whatsappPhoneE164: '+6281234567890',
      },
      {
        displayName: 'Rani',
        personalLinkReaccessState: 'recoverable',
        personalLinkState: 'active',
        rsvpStatus: 'pending',
        whatsappAvailability: 'missing',
        whatsappPhoneE164: null,
      },
      {
        displayName: 'Dimas',
        personalLinkReaccessState: 'legacy',
        personalLinkState: 'active',
        rsvpStatus: 'declined',
        whatsappAvailability: 'available',
        whatsappPhoneE164: '+6289876543210',
      },
      {
        displayName: 'Ayu',
        personalLinkReaccessState: 'unavailable',
        personalLinkState: 'not_created',
        rsvpStatus: 'pending',
        whatsappAvailability: 'missing',
        whatsappPhoneE164: null,
      },
    ]);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(excelJsBuffer(bytes));
    const sheet = workbook.getWorksheet('Bagikan');
    const values = worksheetText(sheet, 5, 5);

    expect(values).toContain('Status Kesiapan Dibagikan');
    expect(values).toContain('Status Tindak Lanjut');
    expect(values).toContain('+6281234567890');
    expect(values).toContain('Siap dibagikan');
    expect(values).toContain('Butuh nomor WhatsApp');
    expect(values).toContain('Tautan perlu diperbarui');
    expect(values).toContain('Belum punya Undangan Pribadi');
    expect(values).toContain('Lengkapi nomor WhatsApp di Tamu');
    expect(values).toContain('Kelola tautan di Tamu');
    expect(values).toContain('Siapkan Undangan Pribadi');
    expect(values).not.toContain('/g/');
    expect(values).not.toContain('opaque-token');
    expect(values).not.toContain('token_ciphertext');
    expect(values).not.toContain('token_key_version');
    expect(values).not.toContain('token_hash');
  });
});
