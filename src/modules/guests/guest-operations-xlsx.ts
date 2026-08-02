import 'server-only';

import ExcelJS from 'exceljs';

import { getGuestLinkLifecycleCopy } from '@/modules/guest-links/guest-link-lifecycle';

import type { GuestListItem } from './guest.types';

const EXPORT_SHEET_NAME = 'Tamu';

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true };
  row.eachCell((cell) => {
    cell.fill = { fgColor: { argb: 'FFF6EFEA' }, pattern: 'solid', type: 'pattern' };
  });
}

function getGuestLinkStatus(guest: GuestListItem) {
  if (guest.link_lifecycle_state) {
    return getGuestLinkLifecycleCopy(guest.link_lifecycle_state).label;
  }
  if (guest.link_state === 'active') return 'Aktif';
  if (guest.link_state === 'revoked') return 'Dinonaktifkan';
  return 'Belum tersedia';
}

function getFollowUpStatus(guest: GuestListItem) {
  if (guest.link_lifecycle_state === 'active_legacy') return 'Tautan perlu diperbarui';
  if (
    guest.link_lifecycle_state === 'revoked' ||
    guest.link_lifecycle_state === 'expired'
  ) {
    return 'Tautan perlu diperbarui';
  }
  if (
    guest.link_lifecycle_state === 'not_created' ||
    (!guest.link_lifecycle_state && guest.link_state !== 'active')
  ) {
    return 'Belum punya Undangan Pribadi';
  }
  if (!guest.whatsapp_phone_e164) return 'Belum punya nomor WhatsApp';
  if (guest.rsvp_status === 'pending') return 'Belum merespons RSVP';
  return 'Siap dibagikan';
}

function getRsvpStatus(value: GuestListItem['rsvp_status']) {
  if (value === 'attending') return 'Hadir';
  if (value === 'declined') return 'Tidak hadir';
  return 'Belum merespons';
}

/** Owner-private XLSX export. It never receives link material, guestbook, or project data outside the verified rows. */
export async function createGuestOperationsXlsx(guests: readonly GuestListItem[]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(EXPORT_SHEET_NAME);
  sheet.columns = [
    { header: 'Nama Tamu', key: 'displayName', width: 30 },
    { header: 'Grup / Kategori', key: 'groupLabel', width: 22 },
    { header: 'Jumlah Rombongan', key: 'partySize', width: 20 },
    { header: 'Nomor WhatsApp', key: 'whatsapp', width: 22 },
    { header: 'Status RSVP', key: 'rsvp', width: 20 },
    { header: 'Status Undangan Pribadi', key: 'link', width: 32 },
    { header: 'Status Tindak Lanjut', key: 'followUp', width: 30 },
  ];
  styleHeader(sheet.getRow(1));
  for (const guest of guests) {
    sheet.addRow({
      displayName: guest.display_name,
      groupLabel: guest.group_label ?? '',
      link: getGuestLinkStatus(guest),
      partySize: guest.party_size,
      rsvp: getRsvpStatus(guest.rsvp_status),
      whatsapp: guest.whatsapp_phone_e164 ?? '',
      followUp: getFollowUpStatus(guest),
    });
  }
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}
