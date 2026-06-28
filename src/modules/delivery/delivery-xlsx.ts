import 'server-only';

import ExcelJS from 'exceljs';

import type { DeliveryGuestRow } from './delivery.types';

export type DeliveryReadinessExportRow = Pick<
  DeliveryGuestRow,
  'displayName' | 'personalLinkState' | 'rsvpStatus' | 'whatsappAvailability'
> & {
  /** Owner-only export value. This type is never used by the browser table DTO. */
  whatsappPhoneE164: string | null;
};

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true };
  row.eachCell((cell) => {
    cell.fill = { fgColor: { argb: 'FFF6EFEA' }, pattern: 'solid', type: 'pattern' };
  });
}

function linkStatus(row: DeliveryReadinessExportRow) {
  if (row.personalLinkState === 'active') return 'Aktif';
  if (row.personalLinkState === 'revoked') return 'Dinonaktifkan';
  if (row.personalLinkState === 'expired') return 'Kedaluwarsa';
  return 'Belum tersedia';
}

function readiness(row: DeliveryReadinessExportRow) {
  if (row.personalLinkState === 'active' && row.whatsappAvailability === 'available')
    return 'Siap dibagikan';
  if (row.personalLinkState === 'active') return 'Siap dibagikan — tanpa Nomor WhatsApp';
  return 'Belum siap dibagikan';
}

function rsvp(value: DeliveryReadinessExportRow['rsvpStatus']) {
  return value === 'attending' ? 'Hadir' : value === 'declined' ? 'Tidak hadir' : 'Belum merespons';
}

/** Owner-private delivery export. No raw URL, token, ciphertext, or key metadata is accepted. */
export async function createDeliveryReadinessXlsx(rows: readonly DeliveryReadinessExportRow[]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Delivery Center');
  sheet.columns = [
    { header: 'Nama Tamu', key: 'displayName', width: 30 },
    { header: 'Nomor WhatsApp', key: 'whatsapp', width: 22 },
    { header: 'Status Undangan Pribadi', key: 'link', width: 26 },
    { header: 'Status Kesiapan', key: 'readiness', width: 32 },
    { header: 'Status RSVP', key: 'rsvp', width: 20 },
  ];
  styleHeader(sheet.getRow(1));
  for (const row of rows) {
    sheet.addRow({
      displayName: row.displayName,
      link: linkStatus(row),
      readiness: readiness(row),
      rsvp: rsvp(row.rsvpStatus),
      whatsapp: row.whatsappPhoneE164 ?? '',
    });
  }
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}
