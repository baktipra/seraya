import { guestInputSchema } from './guest.schema';
import type { CreateGuestInput, Guest } from './guest.types';

export const GUEST_CSV_HEADERS = ['display_name', 'group_label', 'party_size'] as const;
export const MAX_GUEST_IMPORT_BYTES = 1_000_000;
export const MAX_GUEST_IMPORT_ROWS = 1_000;

export type GuestCsvImportRow = CreateGuestInput;

type GuestCsvValidationCode =
  | 'file_size'
  | 'header'
  | 'malformed'
  | 'row_limit'
  | 'utf8'
  | 'validation';

export class GuestCsvValidationError extends Error {
  readonly code: GuestCsvValidationCode;
  readonly publicMessage: string;

  constructor(code: GuestCsvValidationCode, publicMessage: string) {
    super(code);
    this.name = 'GuestCsvValidationError';
    this.code = code;
    this.publicMessage = publicMessage;
  }
}

type ParsedCsvRecord = {
  fields: string[];
  recordNumber: number;
};

function malformedCsvError() {
  return new GuestCsvValidationError('malformed', 'Format CSV tidak valid.');
}

function finishRecord(
  records: ParsedCsvRecord[],
  fields: string[],
  field: string,
  recordNumber: number,
) {
  records.push({ fields: [...fields, field], recordNumber });
}

/**
 * Deliberately small CSV state machine for the locked comma/UTF-8 contract.
 * It accepts standard quoted fields, escaped quotes, LF, and CRLF without
 * depending on file MIME or a client-side parser.
 */
function parseCsvRecords(source: string): ParsedCsvRecord[] {
  const records: ParsedCsvRecord[] = [];
  let fields: string[] = [];
  let field = '';
  let fieldStarted = false;
  let recordNumber = 1;
  let state: 'after_quote' | 'quoted' | 'unquoted' = 'unquoted';

  function completeRecord() {
    finishRecord(records, fields, field, recordNumber);
    fields = [];
    field = '';
    fieldStarted = false;
    state = 'unquoted';
    recordNumber += 1;
  }

  function completeField() {
    fields.push(field);
    field = '';
    fieldStarted = false;
    state = 'unquoted';
  }

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];

    if (state === 'quoted') {
      if (character === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          state = 'after_quote';
        }
      } else {
        field += character;
      }
      continue;
    }

    if (state === 'after_quote') {
      if (character === ',') {
        completeField();
        continue;
      }

      if (character === '\n') {
        completeRecord();
        continue;
      }

      if (character === '\r') {
        if (source[index + 1] !== '\n') {
          throw malformedCsvError();
        }

        completeRecord();
        index += 1;
        continue;
      }

      throw malformedCsvError();
    }

    if (character === '"') {
      if (fieldStarted || field.length > 0) {
        throw malformedCsvError();
      }

      fieldStarted = true;
      state = 'quoted';
      continue;
    }

    if (character === ',') {
      completeField();
      continue;
    }

    if (character === '\n') {
      completeRecord();
      continue;
    }

    if (character === '\r') {
      if (source[index + 1] !== '\n') {
        throw malformedCsvError();
      }

      completeRecord();
      index += 1;
      continue;
    }

    field += character;
    fieldStarted = true;
  }

  if (state === 'quoted') {
    throw malformedCsvError();
  }

  if (fieldStarted || fields.length > 0) {
    finishRecord(records, fields, field, recordNumber);
  }

  return records;
}

function validateHeaders(record: ParsedCsvRecord | undefined) {
  if (!record || record.fields.length !== GUEST_CSV_HEADERS.length) {
    throw new GuestCsvValidationError(
      'header',
      'Header CSV harus tepat: display_name,group_label,party_size.',
    );
  }

  for (const [index, expected] of GUEST_CSV_HEADERS.entries()) {
    if (record.fields[index] !== expected) {
      throw new GuestCsvValidationError(
        'header',
        'Header CSV harus tepat: display_name,group_label,party_size.',
      );
    }
  }
}

function isBlankRecord(fields: string[]) {
  return fields.every((field) => field.trim().length === 0);
}

function mapIssueColumn(issuePath: PropertyKey | undefined) {
  switch (issuePath) {
    case 'displayName':
      return 'display_name';
    case 'groupLabel':
      return 'group_label';
    case 'partySize':
      return 'party_size';
    default:
      return 'baris';
  }
}

function validateDataRecord(record: ParsedCsvRecord): GuestCsvImportRow {
  if (record.fields.length !== GUEST_CSV_HEADERS.length) {
    throw new GuestCsvValidationError(
      'validation',
      `Baris ${record.recordNumber}: jumlah kolom harus tepat tiga.`,
    );
  }

  const [displayName = '', groupLabel = '', partySize = ''] = record.fields;
  const parsed = guestInputSchema.safeParse({
    displayName,
    groupLabel,
    partySize: partySize.trim().length === 0 ? '1' : partySize,
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const column = mapIssueColumn(issue?.path[0]);
    const reason = issue?.message ?? 'Nilai tidak valid.';
    throw new GuestCsvValidationError(
      'validation',
      `Baris ${record.recordNumber}, kolom ${column}: ${reason}`,
    );
  }

  return {
    displayName: parsed.data.displayName,
    groupLabel: parsed.data.groupLabel,
    partySize: parsed.data.partySize,
  };
}

/** Parses and validates the complete file before any server mutation is allowed. */
export function parseGuestImportCsvBytes(bytes: Uint8Array): GuestCsvImportRow[] {
  if (bytes.byteLength > MAX_GUEST_IMPORT_BYTES) {
    throw new GuestCsvValidationError('file_size', 'Ukuran file CSV maksimal 1 MB.');
  }

  let decoded: string;

  try {
    decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new GuestCsvValidationError('utf8', 'File CSV harus menggunakan encoding UTF-8.');
  }

  const source = decoded.charCodeAt(0) === 0xfeff ? decoded.slice(1) : decoded;
  const records = parseCsvRecords(source);
  validateHeaders(records[0]);

  const imported: GuestCsvImportRow[] = [];

  for (const record of records.slice(1)) {
    if (isBlankRecord(record.fields)) {
      continue;
    }

    if (imported.length >= MAX_GUEST_IMPORT_ROWS) {
      throw new GuestCsvValidationError('row_limit', 'CSV maksimal berisi 1.000 baris data tamu.');
    }

    imported.push(validateDataRecord(record));
  }

  return imported;
}

export async function parseGuestImportCsvFile(file: File): Promise<GuestCsvImportRow[]> {
  return parseGuestImportCsvBytes(new Uint8Array(await file.arrayBuffer()));
}

function spreadsheetSafeCell(value: string) {
  return /^[=+\-@]/.test(value.trimStart()) ? `'${value}` : value;
}

function serializeCsvCell(value: string) {
  const safeValue = spreadsheetSafeCell(value);
  return /[",\r\n]/.test(safeValue) ? `"${safeValue.replaceAll('"', '""')}"` : safeValue;
}

/** Private active-directory export only: no IDs, RSVP, links, or operational columns. */
export function serializeGuestDirectoryCsv(guests: readonly Guest[]): string {
  const records = [GUEST_CSV_HEADERS.join(',')];

  for (const guest of guests) {
    records.push(
      [guest.display_name, guest.group_label ?? '', String(guest.party_size)]
        .map(serializeCsvCell)
        .join(','),
    );
  }

  return `\ufeff${records.join('\r\n')}\r\n`;
}
