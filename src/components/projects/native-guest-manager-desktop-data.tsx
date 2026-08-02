'use client';

import { OperationalDesktopData } from '@/components/workspace/operational-primitives';

import type { NativeGuestManagerController } from './native-guest-manager-controller';
import { getRsvpDisplay, GuestLinkStatus } from './native-guest-manager-lifecycle';
import { NativeGuestManagerRowMenu } from './native-guest-manager-row-menu';

export function NativeGuestManagerDesktopData({
  controller,
}: {
  controller: NativeGuestManagerController;
}) {
  const {
    allVisibleSelected,
    filteredGuests,
    selectedVisibleIds,
    toggleAllGuests,
    toggleGuestSelection,
  } = controller;

  return (
    <OperationalDesktopData label="Tabel lifecycle Undangan Pribadi">
      <table className="w-full min-w-[980px] border-collapse text-left text-sm">
        <thead className="bg-seraya-canvas text-seraya-text-muted text-xs font-semibold tracking-[0.06em] uppercase">
          <tr>
            <th className="w-12 px-3 py-2.5">
              <input
                aria-label="Pilih semua tamu pada hasil aktif"
                checked={allVisibleSelected}
                className="accent-seraya-action-primary size-4"
                onChange={toggleAllGuests}
                type="checkbox"
              />
            </th>
            <th className="px-3 py-2.5">Tamu</th>
            <th className="px-3 py-2.5 text-right">Rombongan</th>
            <th className="px-3 py-2.5">WhatsApp</th>
            <th className="px-3 py-2.5">Undangan Pribadi</th>
            <th className="px-3 py-2.5">RSVP</th>
            <th className="w-12 px-3 py-2.5"><span className="sr-only">Aksi</span></th>
          </tr>
        </thead>
        <tbody className="divide-seraya-border-default bg-seraya-surface divide-y">
          {filteredGuests.map((guest) => (
            <tr className="hover:bg-seraya-soft/45" key={guest.id}>
              <td className="px-3 py-3 align-top">
                <input
                  aria-label={`Pilih ${guest.display_name}`}
                  checked={selectedVisibleIds.includes(guest.id)}
                  className="accent-seraya-action-primary size-4"
                  onChange={() => toggleGuestSelection(guest.id)}
                  type="checkbox"
                />
              </td>
              <td className="px-3 py-3 align-top">
                <p className="text-seraya-text-primary font-semibold">{guest.display_name}</p>
                {guest.group_label ? (
                  <p className="text-seraya-text-muted mt-0.5 text-xs leading-5">{guest.group_label}</p>
                ) : null}
              </td>
              <td className="text-seraya-text-secondary px-3 py-3 text-right align-top tabular-nums">
                {guest.party_size} orang
              </td>
              <td className="text-seraya-text-secondary px-3 py-3 align-top">
                {guest.whatsapp_phone_e164 ?? 'Belum ada nomor'}
              </td>
              <td className="px-3 py-3 align-top"><GuestLinkStatus guest={guest} /></td>
              <td className="text-seraya-text-secondary px-3 py-3 align-top">
                {getRsvpDisplay(guest)}
              </td>
              <td className="px-3 py-3 text-right align-top">
                <NativeGuestManagerRowMenu controller={controller} guest={guest} view="desktop" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </OperationalDesktopData>
  );
}
