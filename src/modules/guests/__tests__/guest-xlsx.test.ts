import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';

import {
  createGuestImportXlsxTemplate,
  GUEST_XLSX_HEADERS,
  GUEST_XLSX_SHEET_NAME,
  GuestXlsxValidationError,
  parseGuestImportXlsxFile,
} from '../guest-xlsx';

type SpreadsheetCell = number | string | null | { formula: string; result: number | string };

function copyToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function excelJsBuffer(bytes: Uint8Array) {
  return Buffer.from(copyToArrayBuffer(bytes)) as unknown as Parameters<
    ExcelJS.Workbook['xlsx']['load']
  >[0];
}

async function xlsxFile(input: {
  fileName?: string;
  mimeType?: string;
  rows?: SpreadsheetCell[][];
  sheetName?: string;
}) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(input.sheetName ?? GUEST_XLSX_SHEET_NAME);
  worksheet.addRow([...GUEST_XLSX_HEADERS]);

  for (const values of input.rows ?? []) {
    const row = worksheet.addRow(values);
    values.forEach((value, index) => {
      if (typeof value === 'object' && value !== null && 'formula' in value) {
        row.getCell(index + 1).value = value;
      }
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new File([new Uint8Array(buffer)], input.fileName ?? 'tamu.xlsx', {
    type: input.mimeType ?? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

async function expectXlsxFailure(
  file: File,
  expectedMessage: string,
): Promise<GuestXlsxValidationError> {
  try {
    await parseGuestImportXlsxFile(file);
  } catch (error) {
    expect(error).toBeInstanceOf(GuestXlsxValidationError);
    expect((error as GuestXlsxValidationError).publicMessage).toContain(expectedMessage);
    return error as GuestXlsxValidationError;
  }

  throw new Error('Expected XLSX parser to fail.');
}

describe('SRY-036 private guest XLSX parser and template', () => {
  it('creates a one-sheet, header-only Tamu template that can be parsed again by the same library', async () => {
    const template = await createGuestImportXlsxTemplate();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(excelJsBuffer(template));

    expect(workbook.worksheets).toHaveLength(1);
    expect(workbook.worksheets[0]?.name).toBe(GUEST_XLSX_SHEET_NAME);
    expect(
      GUEST_XLSX_HEADERS.map(
        (_, index) => workbook.worksheets[0]?.getRow(1).getCell(index + 1).value,
      ),
    ).toEqual([...GUEST_XLSX_HEADERS]);
    expect(workbook.worksheets[0]?.actualRowCount).toBe(1);
    expect(
      await parseGuestImportXlsxFile(new File([copyToArrayBuffer(template)], 'template.xlsx')),
    ).toEqual([]);
  });

  it('imports normalized guests with optional group, party size, and Indonesian WhatsApp formats', async () => {
    const file = await xlsxFile({
      rows: [
        ['Rani', 'Teman', 20, '0812 3456 7890'],
        ['Budi', '', { formula: '=1+1', result: 2 }, '6281234567891'],
        ['Citra', 'Keluarga', '2.0', '+6281234567892'],
      ],
    });

    await expect(parseGuestImportXlsxFile(file)).resolves.toEqual([
      {
        displayName: 'Rani',
        groupLabel: 'Teman',
        partySize: 20,
        whatsappPhoneE164: '+6281234567890',
      },
      {
        displayName: 'Budi',
        groupLabel: null,
        partySize: 2,
        whatsappPhoneE164: '+6281234567891',
      },
      {
        displayName: 'Citra',
        groupLabel: 'Keluarga',
        partySize: 2,
        whatsappPhoneE164: '+6281234567892',
      },
    ]);
  });

  it('accepts normal spreadsheet header capitalization and whitespace only', async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(GUEST_XLSX_SHEET_NAME);
    worksheet.addRow([' nama tamu ', 'GRUP / KATEGORI', 'Jumlah Rombongan ', 'Nomor WhatsApp']);
    worksheet.addRow(['Rani', '', '', '']);
    const buffer = await workbook.xlsx.writeBuffer();

    await expect(
      parseGuestImportXlsxFile(new File([copyToArrayBuffer(new Uint8Array(buffer))], 'tamu.xlsx')),
    ).resolves.toEqual([
      { displayName: 'Rani', groupLabel: null, partySize: 1, whatsappPhoneE164: null },
    ]);
  });

  it.each([
    ['missing name', [['', 'Teman', 1, '']], 'Baris 2: Nama Tamu'],
    ['invalid party size', [['Rani', '', 21, '']], 'Baris 2: Jumlah Rombongan'],
    ['invalid phone', [['Rani', '', 1, '81234567890']], 'Baris 2: Nomor WhatsApp'],
  ])('rejects %s with the spreadsheet row number', async (_label, rows, expected) => {
    await expectXlsxFailure(await xlsxFile({ rows }), expected);
  });

  it('rejects a missing Tamu sheet or incorrect headers with one friendly template message', async () => {
    await expectXlsxFailure(
      await xlsxFile({ rows: [['Rani', '', 1, '']], sheetName: 'Guests' }),
      'Kami tidak menemukan format kolom yang sesuai',
    );

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(GUEST_XLSX_SHEET_NAME);
    worksheet.addRow(['Nama', 'Grup', 'Jumlah', 'WhatsApp']);
    worksheet.addRow(['Rani', '', 1, '']);
    const buffer = await workbook.xlsx.writeBuffer();

    await expectXlsxFailure(
      new File([copyToArrayBuffer(new Uint8Array(buffer))], 'tamu.xlsx'),
      'Kami tidak menemukan format kolom yang sesuai',
    );
  });

  it('rejects non-XLSX, macro-enabled, and oversized uploads before workbook values are trusted', async () => {
    await expectXlsxFailure(
      new File(['not an xlsx'], 'tamu.csv', { type: 'text/csv' }),
      'Pilih file Excel .xlsx',
    );

    const valid = await xlsxFile({ fileName: 'tamu.xlsm' });
    await expectXlsxFailure(valid, 'Pilih file Excel .xlsx');

    await expectXlsxFailure(
      new File([new Uint8Array(1_000_001)], 'tamu.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
      'Ukuran file Excel maksimal 1 MB',
    );
  });
});
