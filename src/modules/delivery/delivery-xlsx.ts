import 'server-only';

import ExcelJS from 'exceljs';

import { deriveDeliveryReadiness } from './delivery-readiness';
import type { DeliveryGuestRow } from './delivery.types';

export type DeliveryReadinessExportRow = Pick<
  DeliveryGuestRow,
  | 'displayName'
  | 'personalLinkReaccessState'
  | 'personalLinkState'
  | 'rsvpStatus'
  | 'whatsappAvailability'
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
  if (row.personalLinkState === 'active' && row.personalLinkReaccessState === 'recoverable') {
    return 'Aktif';
  }
  if (row.personalLinkState === 'active') return 'Aktif · perlu diperbarui';
  if (row.personalLinkState === 'revoked') return 'Dinonaktifkan';
  if (row.personalLinkState === 'expired') return 'Kedaluwarsa';
  return 'Belum tersedia';
}

/** Owner-private delivery export. No raw URL, token, ciphertext, or key metadata is accepted. */
export async function createDeliveryReadinessXlsx(rows: readonly DeliveryReadinessExportRow[]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Bagikan');
  sheet.columns = [
    { header: 'Nama Tamu', key: 'displayName', width: 30 },
    { header: 'Nomor WhatsApp', key: 'whatsapp', width: 22 },
    { header: 'Status Undangan Pribadi', key: 'link', width: 28 },
    { header: 'Status Kesiapan Dibagikan', key: 'readiness', width: 32 },
    { header: 'Status Tindak Lanjut', key: 'followUp', width: 36 },
  ];
  styleHeader(sheet.getRow(1));
  for (const row of rows) {
    const readiness = deriveDeliveryReadiness(row);
    sheet.addRow({
      displayName: row.displayName,
      followUp: readiness.deliveryFollowUpLabel,
      link: linkStatus(row),
      readiness: readiness.deliveryReadinessLabel,
      whatsapp: row.whatsappPhoneE164 ?? '',
    });
  }
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}
