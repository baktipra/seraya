import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';

import { createRsvpResponseXlsx } from '../rsvp-response-xlsx';

function excelJsBuffer(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return Buffer.from(copy.buffer) as unknown as Parameters<ExcelJS.Workbook['xlsx']['load']>[0];
}

function rowValues(sheet: ExcelJS.Worksheet | undefined, rowNumber: number) {
  const values = sheet?.getRow(rowNumber).values;
  return Array.isArray(values) ? values.slice(1) : [];
}

describe('SRY-040 Respons Tamu XLSX export', () => {
  it('exports only approved RSVP columns, actual attendance values, and owner-safe WhatsApp numbers', async () => {
    const bytes = await createRsvpResponseXlsx({
      rows: [
        {
          displayName: 'Alya',
          groupLabel: 'Keluarga',
          guestId: 'guest-1',
          partySize: 9,
          rsvpAttendeeCount: null,
          rsvpStatus: 'pending',
          updatedAt: '2027-08-17T09:00:00.000Z',
        },
        {
          displayName: 'Bima',
          groupLabel: null,
          guestId: 'guest-2',
          partySize: 6,
          rsvpAttendeeCount: 2,
          rsvpStatus: 'attending',
          updatedAt: '2027-08-17T10:00:00.000Z',
        },
        {
          displayName: 'Citra',
          groupLabel: 'Teman',
          guestId: 'guest-3',
          partySize: 4,
          rsvpAttendeeCount: null,
          rsvpStatus: 'declined',
          updatedAt: '2027-08-17T11:00:00.000Z',
        },
      ],
      whatsappPhoneE164ByGuestId: new Map([
        ['guest-1', '+628111111111'],
        ['guest-2', '+628222222222'],
        ['guest-3', null],
      ]),
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(excelJsBuffer(bytes));
    const sheet = workbook.getWorksheet('Respons Tamu');

    expect(sheet).toBeDefined();
    expect(rowValues(sheet, 1)).toEqual([
      'Nama Tamu',
      'Grup / Kategori',
      'Status RSVP',
      'Jumlah Rombongan Hadir',
      'Nomor WhatsApp',
      'Terakhir Diperbarui',
    ]);
    expect(rowValues(sheet, 2)).toEqual([
      'Alya',
      'Keluarga',
      'Belum merespons',
      '',
      '+628111111111',
      '2027-08-17T09:00:00.000Z',
    ]);
    expect(rowValues(sheet, 3)).toEqual([
      'Bima',
      '',
      'Hadir',
      2,
      '+628222222222',
      '2027-08-17T10:00:00.000Z',
    ]);
    expect(rowValues(sheet, 4)).toEqual([
      'Citra',
      'Teman',
      'Tidak hadir',
      '',
      '',
      '2027-08-17T11:00:00.000Z',
    ]);
  });

  it('never puts guestbook content, personal URLs, raw tokens, hashes, or ciphertext into the workbook contract', async () => {
    const bytes = await createRsvpResponseXlsx({
      rows: [
        {
          displayName: 'Alya',
          groupLabel: null,
          guestId: 'guest-1',
          partySize: 1,
          rsvpAttendeeCount: 1,
          rsvpStatus: 'attending',
          updatedAt: '2027-08-17T09:00:00.000Z',
        },
      ],
      whatsappPhoneE164ByGuestId: new Map([['guest-1', null]]),
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(excelJsBuffer(bytes));
    const sheet = workbook.getWorksheet('Respons Tamu');
    const headers = (rowValues(sheet, 1) ?? []).map(String).join('|').toLowerCase();
    const values = (rowValues(sheet, 2) ?? []).map(String).join('|').toLowerCase();

    for (const forbidden of [
      'guestbook',
      'ucapan',
      'http',
      'token',
      'hash',
      'cipher',
      'link',
      'tautan',
      'payment',
    ]) {
      expect(headers).not.toContain(forbidden);
      expect(values).not.toContain(forbidden);
    }
  });
});
