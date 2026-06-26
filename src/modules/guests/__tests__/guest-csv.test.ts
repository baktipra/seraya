import { describe, expect, it } from 'vitest';

import {
  GuestCsvValidationError,
  MAX_GUEST_IMPORT_BYTES,
  MAX_GUEST_IMPORT_ROWS,
  parseGuestImportCsvBytes,
  serializeGuestDirectoryCsv,
} from '../guest-csv';
import type { Guest } from '../guest.types';

const encoder = new TextEncoder();

function parse(source: string) {
  return parseGuestImportCsvBytes(encoder.encode(source));
}

function expectCsvFailure(source: string, expectedMessage: string) {
  try {
    parse(source);
  } catch (error) {
    expect(error).toBeInstanceOf(GuestCsvValidationError);
    expect((error as GuestCsvValidationError).publicMessage).toContain(expectedMessage);
    return;
  }

  throw new Error('Expected CSV parser to fail.');
}

const sampleGuest: Guest = {
  created_at: '2026-06-21T00:00:00.000Z',
  deleted_at: null,
  display_name: '=SUM(1,1)',
  group_label: ' @Keluarga',
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  party_size: 2,
  project_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  rsvp_attendee_count: 2,
  rsvp_status: 'attending',
  updated_at: '2026-06-21T00:00:00.000Z',
  whatsapp_phone_e164: '+6281234567890',
};

describe('SRY-014 private guest CSV parser and export serializer', () => {
  it('accepts UTF-8, optional BOM, quoted commas, escaped quotes, LF, and CRLF', () => {
    expect(
      parse(
        '\ufeffdisplay_name,group_label,party_size\r\n"Keluarga, Budi","Teman ""Dekat""",2\r\nRani,,\n',
      ),
    ).toEqual([
      { displayName: 'Keluarga, Budi', groupLabel: 'Teman "Dekat"', partySize: 2 },
      { displayName: 'Rani', groupLabel: null, partySize: 1 },
    ]);
  });

  it('ignores fully blank rows but fails a blank display_name on an otherwise populated row', () => {
    expect(parse('display_name,group_label,party_size\n\n   ,  ,   \nRani,Teman,1\n')).toEqual([
      { displayName: 'Rani', groupLabel: 'Teman', partySize: 1 },
    ]);

    expectCsvFailure('display_name,group_label,party_size\n,Teman,1\n', 'display_name');
  });

  it('normalizes group_label and blank party_size through the existing guest contract', () => {
    expect(parse('display_name,group_label,party_size\n  Rani  ,   ,\n')).toEqual([
      { displayName: 'Rani', groupLabel: null, partySize: 1 },
    ]);
  });

  it.each([
    ['empty name', 'display_name,group_label,party_size\n   ,,1\n', 'display_name'],
    [
      'name longer than 120 characters',
      `display_name,group_label,party_size\n${'a'.repeat(121)},,1\n`,
      'display_name',
    ],
    [
      'group longer than 40 characters',
      `display_name,group_label,party_size\nRani,${'g'.repeat(41)},1\n`,
      'group_label',
    ],
    ['decimal party size', 'display_name,group_label,party_size\nRani,,1.5\n', 'party_size'],
    ['negative party size', 'display_name,group_label,party_size\nRani,,-1\n', 'party_size'],
    ['zero party size', 'display_name,group_label,party_size\nRani,,0\n', 'party_size'],
    ['too large party size', 'display_name,group_label,party_size\nRani,,21\n', 'party_size'],
  ])('rejects %s without exposing row contents', (_label, source, column) => {
    expectCsvFailure(source, column);
  });

  it.each([
    'display_name,party_size,group_label\nRani,1,Teman\n',
    'display_name,group_label\nRani,Teman\n',
    'display_name,group_label,party_size,extra\nRani,Teman,1,x\n',
    'display_name,display_name,party_size\nRani,Teman,1\n',
    'display_name,group_label,unknown\nRani,Teman,1\n',
  ])('rejects missing, reordered, duplicate, unknown, and extra headers', (source) => {
    expectCsvFailure(source, 'Header CSV');
  });

  it('fails malformed quote placement and invalid UTF-8 safely', () => {
    expectCsvFailure('display_name,group_label,party_size\n"Rani,Teman,1\n', 'Format CSV');
    expectCsvFailure('display_name,group_label,party_size\nRa"ni,Teman,1\n', 'Format CSV');

    expect(() => parseGuestImportCsvBytes(new Uint8Array([0xc3, 0x28]))).toThrow(
      GuestCsvValidationError,
    );
    try {
      parseGuestImportCsvBytes(new Uint8Array([0xc3, 0x28]));
    } catch (error) {
      expect((error as GuestCsvValidationError).publicMessage).toBe(
        'File CSV harus menggunakan encoding UTF-8.',
      );
    }
  });

  it('enforces the hard one megabyte and 1,000 nonblank-row caps before any mutation layer', () => {
    expect(() => parseGuestImportCsvBytes(new Uint8Array(MAX_GUEST_IMPORT_BYTES + 1))).toThrow(
      GuestCsvValidationError,
    );

    const rows = Array.from(
      { length: MAX_GUEST_IMPORT_ROWS + 1 },
      (_, index) => `Tamu ${index},,1`,
    );
    expectCsvFailure(`display_name,group_label,party_size\n${rows.join('\n')}\n`, '1.000 baris');
  });

  it('exports only the allowed columns with a UTF-8 BOM and spreadsheet-safe literalization', () => {
    const csv = serializeGuestDirectoryCsv([
      sampleGuest,
      { ...sampleGuest, display_name: '+plus', group_label: '-minus', party_size: 1 },
      { ...sampleGuest, display_name: '@mention', group_label: null, party_size: 3 },
    ]);

    expect(csv.startsWith('\ufeffdisplay_name,group_label,party_size\r\n')).toBe(true);
    expect(csv).toContain('"\'=SUM(1,1)",\' @Keluarga,2');
    expect(csv).toContain("'+plus,'-minus,1");
    expect(csv).toContain("'@mention,,3");
    expect(csv).not.toContain('rsvp_status');
    expect(csv).not.toContain('rsvp_attendee_count');
    expect(csv).not.toContain('project_id');
    expect(csv).not.toContain('whatsapp_phone_e164');
    expect(csv).not.toContain(sampleGuest.whatsapp_phone_e164);
    expect(csv).not.toContain(sampleGuest.id);
  });
});
