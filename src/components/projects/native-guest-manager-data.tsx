'use client';

import {
  OperationalDataSurface,
  OperationalEmptyState,
  OperationalSelectionBar,
} from '@/components/workspace/operational-primitives';
import { Button } from '@/design-system';

import type { NativeGuestManagerController } from './native-guest-manager-controller';
import { NativeGuestManagerDesktopData } from './native-guest-manager-desktop-data';
import { NativeGuestManagerMobileData } from './native-guest-manager-mobile-data';

export function NativeGuestManagerData({
  controller,
}: {
  controller: NativeGuestManagerController;
}) {
  const {
    exportGuests,
    filteredGuests,
    initialGuests,
    selectedEligibleIds,
    selectedVisibleIds,
    setAddOpen,
    setBatchOpen,
    setSelectedGuestIds,
  } = controller;

  return (
    <>
      <OperationalDataSurface>
        {initialGuests.length === 0 ? (
          <OperationalEmptyState
            action={<Button onClick={() => setAddOpen(true)} type="button">Tambah tamu pertama</Button>}
            description="Tambahkan daftar tamu saat kalian siap menyiapkan undangan secara personal."
            title="Belum ada tamu yang disiapkan."
          />
        ) : filteredGuests.length === 0 ? (
          <OperationalEmptyState
            description="Ubah pencarian atau filter untuk melihat data tamu lain."
            title="Tidak ada tamu yang sesuai."
          />
        ) : (
          <>
            <NativeGuestManagerDesktopData controller={controller} />
            <NativeGuestManagerMobileData controller={controller} />
          </>
        )}
      </OperationalDataSurface>

      {filteredGuests.length > 0 ? (
        <OperationalSelectionBar
          actions={
            <>
              <Button
                disabled={selectedEligibleIds.length === 0}
                onClick={() => setBatchOpen(true)}
                size="sm"
                type="button"
              >
                Siapkan Undangan Pribadi
              </Button>
              <Button
                disabled={selectedVisibleIds.length === 0}
                onClick={() => void exportGuests(selectedVisibleIds)}
                size="sm"
                type="button"
                variant="secondary"
              >
                Export Excel
              </Button>
              <Button
                disabled={selectedVisibleIds.length === 0}
                onClick={() => setSelectedGuestIds([])}
                size="sm"
                type="button"
                variant="text"
              >
                Batalkan pilihan
              </Button>
            </>
          }
          status={
            <>
              <span className="text-seraya-text-primary font-semibold">
                {selectedVisibleIds.length} tamu terpilih
              </span>{' '}
              · {selectedEligibleIds.length} dapat disiapkan tanpa mengganti link aktif
            </>
          }
        />
      ) : null}
    </>
  );
}
