'use client';

import Link from 'next/link';

import { Button, Dialog, Input } from '@/design-system';

import type { NativeGuestManagerController } from './native-guest-manager-controller';

export function NativeGuestManagerImportDialog({
  controller,
}: {
  controller: NativeGuestManagerController;
}) {
  const {
    csvImportAction,
    csvImportPending,
    csvImportState,
    importMode,
    importOpen,
    projectId,
    setImportMode,
    setImportOpen,
    xlsxImportAction,
    xlsxImportPending,
    xlsxImportState,
  } = controller;

  return (
    <>
      <Dialog
        description="Import Excel direkomendasikan untuk menyiapkan tamu dan Nomor WhatsApp. CSV tetap tersedia sebagai opsi lain."
        onOpenChange={setImportOpen}
        open={importOpen}
        title="Import daftar tamu"
      >
        <div className="space-y-5">
          <div aria-label="Pilih format import" className="flex flex-wrap gap-2" role="group">
            <Button
              aria-pressed={importMode === 'xlsx'}
              onClick={() => setImportMode('xlsx')}
              size="sm"
              type="button"
              variant={importMode === 'xlsx' ? 'primary' : 'secondary'}
            >
              Import Excel (.xlsx)
            </Button>
            <Button
              aria-pressed={importMode === 'csv'}
              onClick={() => setImportMode('csv')}
              size="sm"
              type="button"
              variant={importMode === 'csv' ? 'primary' : 'secondary'}
            >
              Import CSV
            </Button>
          </div>

          {importMode === 'xlsx' ? (
            <form action={xlsxImportAction} className="space-y-5" noValidate>
              <input name="projectId" type="hidden" value={projectId} />
              <div className="border-seraya-border-default bg-seraya-canvas rounded-[var(--seraya-radius-sm)] border px-4 py-4 text-sm leading-6">
                <p className="text-seraya-text-primary font-semibold">Mulai dari template Excel</p>
                <p className="text-seraya-text-secondary mt-1">
                  Unduh template Excel, isi daftar tamu, lalu upload kembali. Nomor WhatsApp
                  bersifat opsional dan digunakan untuk mempermudah pembagian Undangan Pribadi
                  secara manual.
                </p>
                <a
                  className="text-seraya-action-primary focus-visible:outline-seraya-focus-ring mt-3 inline-flex min-h-11 items-center rounded-[var(--seraya-radius-sm)] text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-3"
                  href={`/dashboard/${projectId}/guests/template`}
                >
                  Download template Excel
                </a>
              </div>
              <div className="space-y-2">
                <label
                  className="text-seraya-text-primary text-sm font-semibold"
                  htmlFor="guest-xlsx-file"
                >
                  File Excel (.xlsx)
                </label>
                <Input
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  id="guest-xlsx-file"
                  name="file"
                  required
                  type="file"
                />
              </div>
              <div className="border-seraya-border-default rounded-[var(--seraya-radius-sm)] border px-4 py-3 text-sm leading-6">
                <p className="text-seraya-text-primary font-semibold">Yang perlu diperhatikan</p>
                <ul className="text-seraya-text-secondary mt-3 list-disc space-y-1 pl-5">
                  <li>Gunakan template Excel Seraya agar format kolom sesuai.</li>
                  <li>Hanya sheet bernama Tamu yang diproses.</li>
                  <li>Nama Tamu wajib diisi; Nomor WhatsApp bersifat opsional.</li>
                  <li>Jumlah Rombongan boleh kosong dan akan menjadi 1.</li>
                  <li>Import tidak otomatis mengirim WhatsApp atau membuat Undangan Pribadi.</li>
                  <li>Maksimal 1.000 baris data dan 1 MB.</li>
                </ul>
              </div>
              {xlsxImportState.status === 'error' && xlsxImportState.message ? (
                <p className="text-seraya-status-error text-sm leading-6" role="alert">
                  {xlsxImportState.message}
                </p>
              ) : null}
              {xlsxImportState.status === 'success' && xlsxImportState.message ? (
                <div
                  className="border-seraya-border-default bg-seraya-brand-soft rounded-[var(--seraya-radius-sm)] border px-4 py-4 text-sm leading-6"
                  role="status"
                >
                  <p className="text-seraya-text-primary font-semibold">
                    Tamu berhasil ditambahkan.
                  </p>
                  <p className="text-seraya-text-secondary mt-1">{xlsxImportState.message}</p>
                  <Link
                    className="text-seraya-action-primary focus-visible:outline-seraya-focus-ring mt-3 inline-flex min-h-11 items-center rounded-[var(--seraya-radius-sm)] text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-3"
                    href={`/dashboard/${projectId}/delivery`}
                    onClick={() => setImportOpen(false)}
                  >
                    Buka Bagikan
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <Button onClick={() => setImportOpen(false)} type="button" variant="secondary">
                    Batal
                  </Button>
                  <Button loading={xlsxImportPending} type="submit">
                    Import tamu dari Excel
                  </Button>
                </div>
              )}
            </form>
          ) : (
            <form action={csvImportAction} className="space-y-5" noValidate>
              <input name="projectId" type="hidden" value={projectId} />
              <div className="space-y-2">
                <label
                  className="text-seraya-text-primary text-sm font-semibold"
                  htmlFor="guest-csv-file"
                >
                  File CSV
                </label>
                <Input accept=".csv,text/csv" id="guest-csv-file" name="file" required type="file" />
              </div>
              <div className="border-seraya-border-default bg-seraya-canvas rounded-[var(--seraya-radius-sm)] border px-4 py-3 text-sm leading-6">
                <p className="text-seraya-text-primary font-semibold">Format CSV yang diperlukan</p>
                <p className="text-seraya-text-secondary mt-1 font-mono text-xs">
                  display_name,group_label,party_size
                </p>
                <ul className="text-seraya-text-secondary mt-3 list-disc space-y-1 pl-5">
                  <li>group_label boleh kosong.</li>
                  <li>party_size boleh kosong dan akan menjadi 1.</li>
                  <li>Import hanya menambahkan tamu baru; tidak mengubah tamu yang ada.</li>
                  <li>RSVP tamu hasil import tetap Belum merespons.</li>
                  <li>Tautan pribadi tidak dibuat melalui import.</li>
                  <li>Maksimal 1.000 baris data dan 1 MB.</li>
                </ul>
              </div>
              {csvImportState.status === 'error' && csvImportState.message ? (
                <p className="text-seraya-status-error text-sm leading-6" role="alert">
                  {csvImportState.message}
                </p>
              ) : null}
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button onClick={() => setImportOpen(false)} type="button" variant="secondary">
                  Batal
                </Button>
                <Button loading={csvImportPending} type="submit">
                  Import CSV
                </Button>
              </div>
            </form>
          )}
        </div>
      </Dialog>
    </>
  );
}
