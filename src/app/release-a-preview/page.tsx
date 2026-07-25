import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { ProjectNavigation } from '@/components/dashboard/project-navigation';
import { ProjectSetupForm } from '@/components/projects/project-setup-form';

export const metadata: Metadata = {
  title: 'Release A preview',
  robots: {
    follow: false,
    index: false,
  },
};

function WorkspacePreviewCanvas() {
  return (
    <div className="grid min-w-0 gap-7 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8">
      <ProjectNavigation
        coupleLabel="Mira & Arga"
        projectId="release-a-preview"
        statusLabel="Draf pribadi · belum diterbitkan"
      />

      <section
        aria-labelledby="release-a-workspace-title"
        className="min-w-0 pb-10"
        id="project-workspace-content"
        tabIndex={-1}
      >
        <div className="border-seraya-border-default flex flex-col gap-6 border-b pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <p className="seraya-eyebrow text-seraya-action-primary">Ringkasan project</p>
            <h1
              className="text-seraya-text-primary mt-4 font-serif text-[clamp(3rem,6vw,5rem)] leading-[0.9] font-medium tracking-[-0.05em]"
              id="release-a-workspace-title"
            >
              Undangan kalian mulai memiliki arah.
            </h1>
            <p className="text-seraya-text-secondary mt-5 max-w-2xl text-base leading-7">
              Lanjutkan bagian terpenting terlebih dahulu. Seraya menjaga satu langkah utama tetap
              terlihat tanpa memenuhi layar dengan banyak keputusan.
            </p>
          </div>
          <button
            className="bg-seraya-action-primary text-seraya-text-inverse inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-[var(--seraya-radius-pill)] px-5 text-sm font-semibold shadow-[0_12px_28px_rgb(142_75_82_/_0.17)]"
            type="button"
          >
            Lanjutkan undangan <span aria-hidden="true">→</span>
          </button>
        </div>

        <div className="mt-8 grid gap-5 xl:grid-cols-[minmax(0,1.18fr)_minmax(18rem,0.82fr)]">
          <article className="border-seraya-border-default bg-seraya-surface min-w-0 border p-6 sm:p-8">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-seraya-text-muted text-[0.65rem] font-semibold tracking-[0.14em] uppercase">
                  Langkah berikutnya
                </p>
                <h2 className="text-seraya-text-primary mt-3 font-serif text-3xl leading-[0.95] font-medium tracking-[-0.035em]">
                  Lengkapi detail acara utama
                </h2>
              </div>
              <span className="bg-seraya-brand-soft text-seraya-action-primary rounded-full px-3 py-1.5 text-xs font-semibold">
                Prioritas
              </span>
            </div>
            <p className="text-seraya-text-secondary mt-5 max-w-xl text-sm leading-6">
              Tambahkan waktu, venue, dan lokasi agar tamu menerima informasi acara yang jelas.
            </p>
            <div className="border-seraya-border-default mt-8 flex items-center justify-between gap-4 border-t pt-5">
              <p className="text-seraya-text-muted text-xs">Sekitar 3 menit</p>
              <button className="text-seraya-action-primary text-sm font-semibold" type="button">
                Lengkapi sekarang →
              </button>
            </div>
          </article>

          <article className="bg-seraya-soft min-w-0 p-6 sm:p-8">
            <p className="text-seraya-text-muted text-[0.65rem] font-semibold tracking-[0.14em] uppercase">
              Progress undangan
            </p>
            <p className="text-seraya-text-primary mt-4 font-serif text-5xl leading-none font-medium">
              36%
            </p>
            <div className="bg-seraya-border-default mt-5 h-1.5 overflow-hidden rounded-full">
              <div className="bg-seraya-action-primary h-full w-[36%] rounded-full" />
            </div>
            <dl className="mt-7 space-y-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-seraya-text-secondary">Identitas pasangan</dt>
                <dd className="text-seraya-status-success font-semibold">Selesai</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-seraya-text-secondary">Acara utama</dt>
                <dd className="text-seraya-action-primary font-semibold">Perlu dilengkapi</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-seraya-text-secondary">Galeri dan cerita</dt>
                <dd className="text-seraya-text-muted font-semibold">Belum dimulai</dd>
              </div>
            </dl>
          </article>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-3">
          {[
            ['Roselle', 'Koleksi aktif'],
            ['0 tamu', 'Siap ditambahkan'],
            ['Belum terbit', 'Draf tetap pribadi'],
          ].map(([value, label]) => (
            <article className="border-seraya-border-default bg-seraya-surface border p-5" key={label}>
              <p className="text-seraya-text-primary font-serif text-2xl font-medium">{value}</p>
              <p className="text-seraya-text-muted mt-2 text-xs leading-5">{label}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function ReleaseAPreviewPage() {
  if (process.env.VERCEL_ENV === 'production') {
    notFound();
  }

  return (
    <div className="bg-seraya-canvas min-h-screen">
      <header className="border-seraya-border-default bg-seraya-ink border-b text-white">
        <div className="mx-auto flex min-h-14 max-w-[94rem] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold tracking-[0.14em] uppercase">Release A showroom</p>
          <p className="text-xs text-white/65">Data fiktif · preview-only · tidak tersedia di production</p>
        </div>
      </header>

      <main>
        <section aria-labelledby="guided-entry-preview-title" className="px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
          <div className="mx-auto mb-8 max-w-[88rem]">
            <p className="seraya-eyebrow text-seraya-action-primary">Experience 01</p>
            <h1
              className="text-seraya-text-primary mt-3 font-serif text-[clamp(2.6rem,5vw,4.5rem)] leading-[0.9] font-medium tracking-[-0.045em]"
              id="guided-entry-preview-title"
            >
              Guided project creation
            </h1>
            <p className="text-seraya-text-secondary mt-4 max-w-2xl text-sm leading-6">
              Isi langkah pertama lalu tekan “Pilih pengalaman” untuk melihat pemilihan Roselle,
              Aruna, dan Laras. Hindari submit final karena showroom tidak menggunakan sesi owner.
            </p>
          </div>
          <ProjectSetupForm />
        </section>

        <section aria-labelledby="workspace-preview-title" className="border-seraya-border-default border-t">
          <div className="mx-auto max-w-[94rem] px-4 pt-14 sm:px-6 sm:pt-18 lg:px-8 lg:pt-20">
            <p className="seraya-eyebrow text-seraya-action-primary">Experience 02</p>
            <h2
              className="text-seraya-text-primary mt-3 font-serif text-[clamp(2.6rem,5vw,4.5rem)] leading-[0.9] font-medium tracking-[-0.045em]"
              id="workspace-preview-title"
            >
              Canonical five-item workspace
            </h2>
            <p className="text-seraya-text-secondary mt-4 max-w-2xl text-sm leading-6">
              Shell menggunakan lima tanggung jawab yang dikunci: Ringkasan, Undangan, Tamu,
              Bagikan, dan Respons Tamu.
            </p>
          </div>

          <div className="mt-8">
            <DashboardShell
              displayName="Mira"
              email="preview@seraya.test"
              hasActiveProject
            >
              <WorkspacePreviewCanvas />
            </DashboardShell>
          </div>
        </section>
      </main>
    </div>
  );
}
