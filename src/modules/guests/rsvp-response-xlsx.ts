import 'server-only';

import ExcelJS from 'exceljs';

import type { RsvpResponseRow } from './rsvp-analytics.types';

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true };
  row.eachCell((cell) => {
    cell.fill = { fgColor: { argb: 'FFF6EFEA' }, pattern: 'solid', type: 'pattern' };
  });
}

function rsvpStatus(value: RsvpResponseRow['rsvpStatus']) {
  if (value === 'attending') return 'Hadir';
  if (value === 'declined') return 'Tidak hadir';
  return 'Belum merespons';
}

/** Private owner export with RSVP data only; capability, link, and ucapan material never enter. */
export async function createRsvpResponseXlsx(input: {
  rows: readonly RsvpResponseRow[];
  whatsappPhoneE164ByGuestId: ReadonlyMap<string, string | null>;
}) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Respons Tamu');
  sheet.columns = [
    { header: 'Nama Tamu', key: 'displayName', width: 30 },
    { header: 'Grup / Kategori', key: 'groupLabel', width: 22 },
    { header: 'Status RSVP', key: 'rsvpStatus', width: 20 },
    { header: 'Jumlah Rombongan Hadir', key: 'attendeeCount', width: 28 },
    { header: 'Nomor WhatsApp', key: 'whatsappPhoneE164', width: 22 },
    { header: 'Terakhir Diperbarui', key: 'updatedAt', width: 24 },
  ];
  styleHeader(sheet.getRow(1));

  for (const row of input.rows) {
    sheet.addRow({
      attendeeCount:
        row.rsvpStatus === 'attending' && row.rsvpAttendeeCount !== null
          ? row.rsvpAttendeeCount
          : '',
      displayName: row.displayName,
      groupLabel: row.groupLabel ?? '',
      rsvpStatus: rsvpStatus(row.rsvpStatus),
      updatedAt: row.updatedAt,
      whatsappPhoneE164: input.whatsappPhoneE164ByGuestId.get(row.guestId) ?? '',
    });
  }

  return new Uint8Array(await workbook.xlsx.writeBuffer());
}
