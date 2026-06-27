import 'server-only';

import ExcelJS, {
  type CellErrorValue,
  type CellFormulaValue,
  type CellSharedFormulaValue,
  type CellValue,
} from 'exceljs';

import { MAX_GUEST_IMPORT_BYTES, MAX_GUEST_IMPORT_ROWS } from './guest-csv';
import { guestInputSchema } from './guest.schema';
import type { CreateGuestInput } from './guest.types';

export const GUEST_XLSX_SHEET_NAME = 'Tamu';
export const GUEST_XLSX_HEADERS = [
  'Nama Tamu',
  'Grup / Kategori',
  'Jumlah Rombongan',
  'Nomor WhatsApp',
] as const;

const acceptedXlsxMimeTypes = new Set([
  '',
  'application/octet-stream',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

const xlsxZipSignatures = [
  [0x50, 0x4b, 0x03, 0x04],
  [0x50, 0x4b, 0x05, 0x06],
] as const;

export type GuestXlsxImportRow = CreateGuestInput;

type GuestXlsxValidationCode =
  | 'file_size'
  | 'file_type'
  | 'header'
  | 'malformed'
  | 'row_limit'
  | 'validation';

export class GuestXlsxValidationError extends Error {
  readonly code: GuestXlsxValidationCode;
  readonly publicMessage: string;

  constructor(code: GuestXlsxValidationCode, publicMessage: string) {
    super(code);
    this.name = 'GuestXlsxValidationError';
    this.code = code;
    this.publicMessage = publicMessage;
  }
}

type FormulaCellValue = CellFormulaValue | CellSharedFormulaValue;

type SpreadsheetScalar = number | string | null;

type ExcelJsLoadBuffer = Parameters<ExcelJS.Workbook['xlsx']['load']>[0];

function copyToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function toExcelJsLoadBuffer(bytes: Uint8Array): ExcelJsLoadBuffer {
  // ExcelJS currently exposes an older Buffer generic than Node 22. Copying the
  // upload first also guarantees a plain ArrayBuffer at this third-party boundary.
  return Buffer.from(copyToArrayBuffer(bytes)) as unknown as ExcelJsLoadBuffer;
}

function isFormulaCellValue(value: CellValue): value is FormulaCellValue {
  return (
    typeof value === 'object' && value !== null && ('formula' in value || 'sharedFormula' in value)
  );
}

function isCellErrorValue(value: CellValue | undefined): value is CellErrorValue {
  return typeof value === 'object' && value !== null && 'error' in value;
}

function normalizedHeaderValue(value: SpreadsheetScalar) {
  return (typeof value === 'string' ? value : String(value ?? ''))
    .replace(/^\uFEFF/u, '')
    .trim()
    .toLocaleLowerCase('id-ID');
}

function isAllowedZipSignature(bytes: Uint8Array) {
  return xlsxZipSignatures.some((signature) =>
    signature.every((value, index) => bytes[index] === value),
  );
}

function containsMacroMarker(bytes: Uint8Array) {
  return new TextDecoder('latin1').decode(bytes).includes('vbaProject.bin');
}

function fileTypeError() {
  return new GuestXlsxValidationError(
    'file_type',
    'Pilih file Excel .xlsx dari template Seraya. File macro tidak dapat diimpor.',
  );
}

function workbookFormatError() {
  return new GuestXlsxValidationError(
    'malformed',
    'File Excel tidak dapat dibaca. Unduh template Excel Seraya lalu isi kembali data tamu Anda.',
  );
}

function headerError() {
  return new GuestXlsxValidationError(
    'header',
    'Kami tidak menemukan format kolom yang sesuai. Unduh template Excel Seraya lalu isi kembali data tamu Anda.',
  );
}

function getFormulaResult(value: FormulaCellValue): SpreadsheetScalar {
  const result = value.result;

  if (typeof result === 'string' || typeof result === 'number') {
    return result;
  }

  if (result === undefined || result === null) {
    return null;
  }

  return null;
}

/**
 * Returns only saved spreadsheet values. Formulas are never evaluated in the
 * application process; formula cells use their workbook-provided cached result.
 */
function getSpreadsheetScalar(value: CellValue): SpreadsheetScalar {
  if (typeof value === 'string' || typeof value === 'number') {
    return value;
  }

  if (isFormulaCellValue(value)) {
    return getFormulaResult(value);
  }

  if (value === null || value === undefined || isCellErrorValue(value)) {
    return null;
  }

  return null;
}

function isBlankRow(values: SpreadsheetScalar[]) {
  return values.every((value) => String(value ?? '').trim().length === 0);
}

function getPartySizeValue(value: SpreadsheetScalar, rowNumber: number) {
  const source = typeof value === 'number' ? value : String(value ?? '').trim();

  if (source === '') {
    return '1';
  }

  const numeric =
    typeof source === 'number'
      ? source
      : /^\d+(?:\.0+)?$/u.test(source)
        ? Number(source)
        : Number.NaN;

  if (!Number.isFinite(numeric) || !Number.isInteger(numeric) || numeric < 1 || numeric > 20) {
    throw new GuestXlsxValidationError(
      'validation',
      `Baris ${rowNumber}: Jumlah Rombongan harus berupa angka 1 sampai 20.`,
    );
  }

  return String(numeric);
}

function getFieldValue(value: SpreadsheetScalar) {
  return typeof value === 'number' ? String(value) : (value ?? '');
}

function mapValidationIssue(issuePath: PropertyKey | undefined) {
  switch (issuePath) {
    case 'displayName':
      return 'Nama Tamu';
    case 'groupLabel':
      return 'Grup / Kategori';
    case 'whatsappPhoneE164':
      return 'Nomor WhatsApp';
    default:
      return 'data tamu';
  }
}

function validateDataRow(values: SpreadsheetScalar[], rowNumber: number): GuestXlsxImportRow {
  const [displayName = null, groupLabel = null, partySize = null, whatsappPhone = null] = values;
  const parsed = guestInputSchema.safeParse({
    displayName: getFieldValue(displayName),
    groupLabel: getFieldValue(groupLabel),
    partySize: getPartySizeValue(partySize, rowNumber),
    whatsappPhoneE164: getFieldValue(whatsappPhone),
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const column = mapValidationIssue(issue?.path[0]);
    const reason = issue?.message ?? 'Nilai tidak valid.';
    throw new GuestXlsxValidationError('validation', `Baris ${rowNumber}: ${column} ${reason}`);
  }

  return {
    displayName: parsed.data.displayName,
    groupLabel: parsed.data.groupLabel,
    partySize: parsed.data.partySize,
    whatsappPhoneE164: parsed.data.whatsappPhoneE164 ?? null,
  };
}

function validateWorkbookHeaders(worksheet: ExcelJS.Worksheet) {
  const headerRow = worksheet.getRow(1);
  const values = GUEST_XLSX_HEADERS.map((_, index) =>
    getSpreadsheetScalar(headerRow.getCell(index + 1).value),
  );

  const hasUnexpectedHeader = Array.from({ length: worksheet.actualColumnCount }, (_, index) =>
    getSpreadsheetScalar(headerRow.getCell(index + 1).value),
  )
    .slice(GUEST_XLSX_HEADERS.length)
    .some((value) => String(value ?? '').trim().length > 0);

  if (hasUnexpectedHeader) {
    throw headerError();
  }

  for (const [index, expected] of GUEST_XLSX_HEADERS.entries()) {
    if (normalizedHeaderValue(values[index] ?? null) !== normalizedHeaderValue(expected)) {
      throw headerError();
    }
  }
}

function assertXlsxFileIdentity(file: File, bytes: Uint8Array) {
  const normalizedName = file.name.trim().toLocaleLowerCase('id-ID');

  if (
    !normalizedName.endsWith('.xlsx') ||
    normalizedName.endsWith('.xlsm') ||
    !acceptedXlsxMimeTypes.has(file.type.toLocaleLowerCase('en-US')) ||
    !isAllowedZipSignature(bytes) ||
    containsMacroMarker(bytes)
  ) {
    throw fileTypeError();
  }
}

/**
 * Parses the complete workbook before the import service makes any mutation.
 * Only the named `Tamu` sheet is read; no formula is evaluated in process.
 */
export async function parseGuestImportXlsxFile(file: File): Promise<GuestXlsxImportRow[]> {
  if (file.size > MAX_GUEST_IMPORT_BYTES) {
    throw new GuestXlsxValidationError('file_size', 'Ukuran file Excel maksimal 1 MB.');
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  assertXlsxFileIdentity(file, bytes);

  const workbook = new ExcelJS.Workbook();

  try {
    await workbook.xlsx.load(toExcelJsLoadBuffer(bytes));
  } catch {
    throw workbookFormatError();
  }

  const worksheet = workbook.getWorksheet(GUEST_XLSX_SHEET_NAME);

  if (!worksheet) {
    throw headerError();
  }

  validateWorkbookHeaders(worksheet);

  const imported: GuestXlsxImportRow[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }

    const values = GUEST_XLSX_HEADERS.map((_, index) =>
      getSpreadsheetScalar(row.getCell(index + 1).value),
    );

    const hasUnexpectedValue = Array.from(
      { length: Math.max(row.actualCellCount, 4) },
      (_, index) => getSpreadsheetScalar(row.getCell(index + 1).value),
    )
      .slice(GUEST_XLSX_HEADERS.length)
      .some((value) => String(value ?? '').trim().length > 0);

    if (hasUnexpectedValue) {
      throw new GuestXlsxValidationError(
        'validation',
        `Baris ${rowNumber}: jumlah kolom harus tepat empat.`,
      );
    }

    if (isBlankRow(values)) {
      return;
    }

    if (imported.length >= MAX_GUEST_IMPORT_ROWS) {
      throw new GuestXlsxValidationError(
        'row_limit',
        'Excel maksimal berisi 1.000 baris data tamu.',
      );
    }

    imported.push(validateDataRow(values, rowNumber));
  });

  return imported;
}

/** Generates a one-sheet, header-only owner template with text formatting for WhatsApp values. */
export async function createGuestImportXlsxTemplate(): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Seraya';
  workbook.created = new Date('2026-01-01T00:00:00.000Z');
  workbook.modified = new Date('2026-01-01T00:00:00.000Z');

  const worksheet = workbook.addWorksheet(GUEST_XLSX_SHEET_NAME, {
    properties: { defaultRowHeight: 20 },
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  worksheet.columns = [
    { width: 30 },
    { width: 24 },
    { width: 20 },
    { width: 24, style: { numFmt: '@' } },
  ];
  worksheet.addRow([...GUEST_XLSX_HEADERS]);

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: 'middle' };
  headerRow.eachCell((cell) => {
    cell.fill = {
      fgColor: { argb: 'FFF6EFEA' },
      pattern: 'solid',
      type: 'pattern',
    };
  });

  return new Uint8Array(await workbook.xlsx.writeBuffer());
}
