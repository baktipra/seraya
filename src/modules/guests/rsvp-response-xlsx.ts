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

/** Private owner export for response follow-up. It accepts no link material or contact data. */
export async function createRsvpResponseXlsx(input: {
  guestbookGuestIds: ReadonlySet<string>;
  rows: readonly RsvpResponseRow[];
}) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Respons Tamu');
  sheet.columns = [
    { header: 'Nama Tamu', key: 'displayName', width: 30 },
    { header: 'Grup / Kategori', key: 'groupLabel', width: 22 },
    { header: 'Status RSVP', key: 'rsvpStatus', width: 20 },
    { header: 'Rombongan Hadir', key: 'attendeeCount', width: 22 },
    { header: 'Terakhir Diperbarui', key: 'updatedAt', width: 24 },
    { header: 'Status Tindak Lanjut', key: 'followUp', width: 28 },
  ];
  styleHeader(sheet.getRow(1));

  for (const row of input.rows) {
    const followUp =
      row.rsvpStatus === 'pending'
        ? 'Belum merespons RSVP'
        : input.guestbookGuestIds.has(row.guestId)
          ? 'Ada ucapan'
          : 'Respons tercatat';
    sheet.addRow({
      attendeeCount:
        row.rsvpStatus === 'attending'
          ? row.rsvpAttendeeCount === null
            ? 'Belum dicantumkan'
            : row.rsvpAttendeeCount
          : '—',
      displayName: row.displayName,
      followUp,
      groupLabel: row.groupLabel ?? '',
      rsvpStatus: rsvpStatus(row.rsvpStatus),
      updatedAt: row.updatedAt,
    });
  }

  return new Uint8Array(await workbook.xlsx.writeBuffer());
}
