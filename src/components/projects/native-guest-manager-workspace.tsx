'use client';

import Link from 'next/link';

import {
  OperationalHeader,
  OperationalMetric,
  OperationalMetricStrip,
  OperationalSection,
  OperationalToolbar,
  OperationalToolbarField,
  OperationalWorkspace,
} from '@/components/workspace/operational-primitives';
import { Button, Input } from '@/design-system';

import type { NativeGuestManagerController } from './native-guest-manager-controller';
import { NativeGuestManagerData } from './native-guest-manager-data';
import {
  guestLifecycleFilterOptions,
  type GuestLifecycleFilter,
} from './native-guest-manager-lifecycle';

export function NativeGuestManagerWorkspace({
  controller,
}: {
  controller: NativeGuestManagerController;
}) {
  const {
    exportGuests,
    guestFilter,
    guestLifecycleSummary,
    projectId,
    query,
    setAddOpen,
    setImportMode,
    setImportOpen,
    updateGuestFilter,
    updateQuery,
    visibleGuestIds,
  } = controller;

  return (
    <OperationalWorkspace labelledBy="guest-manager-title">
        <OperationalHeader
          actions={
            <>
              <Button
                disabled={visibleGuestIds.length === 0}
                onClick={() => void exportGuests(visibleGuestIds)}
                type="button"
                variant="secondary"
              >
                Export Excel
              </Button>
              <Button
                onClick={() => {
                  setImportMode('xlsx');
                  setImportOpen(true);
                }}
                type="button"
                variant="secondary"
              >
                Import tamu
              </Button>
              <Button onClick={() => setAddOpen(true)} type="button">
                Tambah tamu
              </Button>
            </>
          }
          description="Kelola penerima, data kontak, jumlah undangan, dan status Undangan Pribadi dari satu authority yang sama."
          eyebrow="Tamu undangan"
          title="Daftar tamu"
          titleId="guest-manager-title"
        />

        <OperationalMetricStrip columns={4} label="Status Undangan Pribadi">
          <OperationalMetric
            detail="Semua penerima aktif pada project ini."
            label="Tamu aktif"
            value={guestLifecycleSummary.activeGuestCount}
          />
          <OperationalMetric
            detail="Link aktif yang dapat diakses kembali oleh owner."
            label="Link dapat dikelola"
            value={guestLifecycleSummary.manageableLinkCount}
          />
          <OperationalMetric
            detail="Tamu yang belum pernah mempunyai link."
            label="Belum mempunyai link"
            value={guestLifecycleSummary.missingLinkCount}
          />
          <OperationalMetric
            detail="Link aktif lama, nonaktif, atau kedaluwarsa."
            label="Perlu diperbarui"
            value={guestLifecycleSummary.needsUpdateCount}
          />
        </OperationalMetricStrip>

        <OperationalSection
          description="Status link menunjukkan akses tamu, bukan status kirim atau status baca. Publikasi ulang memperbarui isi undangan tanpa mengganti link aktif."
          title="Kelola tamu"
          titleId="guest-list-title"
        >
          <div
            className="border-seraya-border-default bg-seraya-brand-soft rounded-[var(--seraya-radius-sm)] border px-4 py-3 text-sm leading-6"
            role="note"
          >
            <p className="text-seraya-text-primary font-semibold">
              Isi undangan dan akses tamu adalah dua hal berbeda.
            </p>
            <p className="text-seraya-text-secondary mt-1">
              Lihat dan salin URL aktif tanpa menggantinya. Ganti link hanya ketika akses tamu
              memang perlu diubah; publikasi ulang tidak memerlukan URL baru.
            </p>
          </div>

          <OperationalToolbar label="Cari dan filter tamu berdasarkan lifecycle link">
            <OperationalToolbarField htmlFor="guest-search" label="Cari tamu">
              <Input
                id="guest-search"
                onChange={(event: { target: { value: string } }) => updateQuery(event.target.value)}
                placeholder="Cari nama, grup, atau Nomor WhatsApp"
                value={query}
              />
            </OperationalToolbarField>
            <OperationalToolbarField htmlFor="guest-lifecycle-filter" label="Status Undangan Pribadi">
              <select
                className="border-seraya-border-default bg-seraya-surface text-seraya-text-primary focus-visible:outline-seraya-focus-ring min-h-11 w-full rounded-[var(--seraya-radius-sm)] border px-3 text-sm focus-visible:outline-3 focus-visible:outline-offset-2"
                id="guest-lifecycle-filter"
                onChange={(event: { target: { value: string } }) =>
                  updateGuestFilter(event.target.value as GuestLifecycleFilter)
                }
                value={guestFilter}
              >
                {guestLifecycleFilterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </OperationalToolbarField>
          </OperationalToolbar>

          <NativeGuestManagerData controller={controller} />

          <div className="border-seraya-border-default border-t pt-4">
            <Link
              className="text-seraya-action-primary focus-visible:outline-seraya-focus-ring inline-flex min-h-10 items-center rounded-[var(--seraya-radius-sm)] text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-3"
              href={`/dashboard/${projectId}`}
            >
              ← Kembali ke Ringkasan
            </Link>
          </div>
        </OperationalSection>
      </OperationalWorkspace>

  );
}
