import type { Metadata } from 'next';
import Link from 'next/link';

export const dynamic = 'force-static';
export const revalidate = 3600;

export const metadata: Metadata = {
  title: {
    absolute: 'Seraya — Undangan pernikahan digital yang terasa personal',
  },
  description:
    'Buat undangan pernikahan digital, kelola tamu, bagikan tautan pribadi, dan kumpulkan RSVP dalam satu tempat.',
};

const capabilities = [
  {
    description: 'Lengkapi detail undangan dan lihat hasilnya di preview pribadi.',
    number: '01',
    title: 'Susun undangan dengan tenang',
  },
  {
    description: 'Buat tautan untuk tiap tamu dan siapkan pesan untuk dibagikan lewat WhatsApp.',
    number: '02',
    title: 'Bagikan tautan pribadi',
  },
  {
    description: 'Tamu dapat memilih hadir atau tidak hadir melalui tautan pribadinya.',
    number: '03',
    title: 'Kumpulkan konfirmasi kehadiran',
  },
] as const;

const steps = [
  {
    description: 'Mulai dengan detail dasar acara kalian.',
    title: 'Buat undangan',
  },
  {
    description: 'Atur pembuka, mempelai, acara, lokasi, dan pesan penutup.',
    title: 'Lengkapi isi undangan',
  },
  {
    description: 'Undangan publik tetap memakai versi yang kalian terbitkan.',
    title: 'Aktifkan dan terbitkan saat siap',
  },
  {
    description: 'Bagikan tautan pribadi ke tamu dan lihat konfirmasi mereka di dashboard.',
    title: 'Bagikan dan terima RSVP',
  },
] as const;

const trustStatements = [
  'Draft tetap pribadi sebelum diterbitkan.',
  'Tautan pribadi dibuat untuk tiap tamu.',
  'Perubahan undangan publik dilakukan saat kalian menerbitkan ulang.',
] as const;

const primaryLinkClassName =
  'inline-flex min-h-12 items-center justify-center rounded-[var(--seraya-radius-md)] bg-seraya-action-primary px-5 text-center text-base font-semibold text-seraya-text-inverse shadow-[0_8px_18px_rgb(142_75_82_/_0.16)] transition-colors hover:bg-seraya-action-primary-hover focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-seraya-focus-ring';

const secondaryLinkClassName =
  'inline-flex min-h-12 items-center justify-center rounded-[var(--seraya-radius-md)] border border-seraya-border-default bg-seraya-surface px-5 text-center text-base font-semibold text-seraya-text-primary transition-colors hover:border-seraya-border-strong hover:bg-seraya-canvas focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-seraya-focus-ring';

function ProductPreviewComposition() {
  return (
    <figure
      aria-labelledby="product-preview-caption"
      className="border-seraya-border-default bg-seraya-surface relative mx-auto w-full max-w-xl overflow-hidden rounded-[var(--seraya-radius-xl)] border p-4 shadow-[var(--seraya-shadow-float)] sm:p-6"
    >
      <div
        aria-hidden="true"
        className="bg-seraya-sand/70 absolute -top-16 -right-16 size-44 rounded-full"
      />
      <div
        aria-hidden="true"
        className="bg-seraya-rosewood-soft absolute -bottom-20 -left-16 size-48 rounded-full"
      />

      <div className="relative">
        <div className="mb-5 flex items-center justify-between gap-3">
          <span className="text-seraya-text-muted text-xs font-semibold tracking-[0.12em] uppercase">
            Contoh alur Seraya
          </span>
          <span className="bg-seraya-brand-soft text-seraya-action-primary rounded-full px-3 py-1 text-xs font-semibold">
            Draft pribadi
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
          <section className="border-seraya-border-default bg-seraya-canvas rounded-[calc(var(--seraya-radius-xl)-0.25rem)] border p-5 sm:p-6">
            <p className="text-seraya-action-primary text-xs font-semibold tracking-[0.13em] uppercase">
              Preview undangan
            </p>
            <div className="mt-6 space-y-3">
              <span className="bg-seraya-rosewood-soft block h-2.5 w-16 rounded-full" />
              <span className="bg-seraya-ink/85 block h-7 w-4/5 rounded-full" />
              <span className="bg-seraya-ink/85 block h-7 w-3/5 rounded-full" />
              <span className="bg-seraya-sand mt-6 block h-px w-full" />
              <span className="bg-seraya-ink/70 block h-2.5 w-2/3 rounded-full" />
              <span className="bg-seraya-ink/50 block h-2.5 w-full rounded-full" />
              <span className="bg-seraya-ink/50 block h-2.5 w-5/6 rounded-full" />
            </div>
            <p className="text-seraya-text-secondary mt-7 text-sm leading-6">
              Susun detail, simpan draft, lalu lihat hasilnya sebelum diterbitkan.
            </p>
          </section>

          <div className="flex flex-col gap-4">
            <section className="border-seraya-border-default bg-seraya-paper rounded-[var(--seraya-radius-lg)] border p-4 shadow-[var(--seraya-shadow-soft)]">
              <span className="bg-seraya-sage/20 text-seraya-text-primary inline-flex rounded-full px-2.5 py-1 text-xs font-semibold">
                Tamu
              </span>
              <p className="text-seraya-text-primary mt-4 font-serif text-xl leading-tight tracking-[-0.02em]">
                Tautan pribadi
              </p>
              <span className="bg-seraya-sand mt-4 block h-2 w-full rounded-full" />
              <span className="bg-seraya-sand mt-2 block h-2 w-3/4 rounded-full" />
            </section>

            <section className="bg-seraya-brand-soft rounded-[var(--seraya-radius-lg)] p-4">
              <span className="text-seraya-action-primary text-xs font-semibold tracking-[0.1em] uppercase">
                RSVP
              </span>
              <p className="text-seraya-text-primary mt-3 text-sm leading-5 font-semibold">
                Konfirmasi hadir melalui tautan pribadi.
              </p>
              <div aria-hidden="true" className="mt-4 flex gap-2">
                <span className="bg-seraya-surface h-7 flex-1 rounded-[var(--seraya-radius-sm)]" />
                <span className="bg-seraya-action-primary h-7 flex-1 rounded-[var(--seraya-radius-sm)]" />
              </div>
            </section>
          </div>
        </div>
      </div>

      <figcaption
        id="product-preview-caption"
        className="text-seraya-text-muted relative mt-4 text-xs leading-5"
      >
        Ilustrasi alur kerja Seraya, bukan undangan atau data pasangan yang sedang tayang.
      </figcaption>
    </figure>
  );
}

export default function Home() {
  return (
    <main className="bg-seraya-canvas min-h-screen overflow-x-hidden">
      <header className="border-seraya-border-default/80 border-b">
        <nav
          aria-label="Navigasi utama"
          className="mx-auto flex min-h-18 w-full max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-10"
        >
          <Link
            aria-label="Seraya, kembali ke beranda"
            className="text-seraya-text-primary focus-visible:outline-seraya-focus-ring font-serif text-2xl tracking-[-0.03em] focus-visible:outline-3 focus-visible:outline-offset-4"
            href="/"
          >
            Seraya
          </Link>

          <div className="flex items-center gap-2.5 sm:gap-4">
            <Link
              className="text-seraya-text-secondary hover:text-seraya-text-primary focus-visible:outline-seraya-focus-ring inline-flex min-h-11 items-center justify-center px-2 text-sm font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2"
              href="/login"
            >
              Masuk
            </Link>
            <Link className={`${primaryLinkClassName} hidden sm:inline-flex`} href="/dashboard/new">
              Mulai buat undangan
            </Link>
            <Link
              aria-label="Mulai buat undangan"
              className="bg-seraya-action-primary text-seraya-text-inverse hover:bg-seraya-action-primary-hover focus-visible:outline-seraya-focus-ring inline-flex min-h-11 items-center justify-center rounded-[var(--seraya-radius-md)] px-3.5 text-sm font-semibold shadow-[0_8px_18px_rgb(142_75_82_/_0.16)] transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 sm:hidden"
              href="/dashboard/new"
            >
              Mulai buat undangan
            </Link>
          </div>
        </nav>
      </header>

      <section className="relative">
        <div
          aria-hidden="true"
          className="bg-seraya-sand/65 absolute top-12 right-[-8rem] size-72 rounded-full blur-3xl"
        />
        <div
          aria-hidden="true"
          className="bg-seraya-rosewood-soft/70 absolute bottom-4 left-[-10rem] size-80 rounded-full blur-3xl"
        />

        <div className="relative mx-auto grid w-full max-w-7xl gap-12 px-5 py-16 sm:px-8 sm:py-22 lg:grid-cols-[minmax(0,1.05fr)_minmax(24rem,0.95fr)] lg:items-center lg:gap-14 lg:px-10 lg:py-20">
          <div className="max-w-2xl">
            <p className="text-seraya-action-primary text-sm font-semibold tracking-[0.13em] uppercase">
              Undangan pernikahan digital yang terasa personal
            </p>
            <h1 className="seraya-display-xl mt-5 max-w-2xl lg:!text-[clamp(3.5rem,4.5vw,4rem)] lg:!leading-[0.96]">
              Buat undangan yang rapi,
              <br className="hidden sm:block" /> lalu bagikan dengan cara yang lebih personal.
            </h1>
            <p className="seraya-body-lg text-seraya-text-secondary mt-7 max-w-xl lg:mt-6">
              Susun undangan, kelola tamu, dan kumpulkan konfirmasi kehadiran dalam satu tempat yang
              tenang dan mudah dipakai.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:mt-7">
              <Link className={primaryLinkClassName} href="/dashboard/new">
                Mulai buat undangan
              </Link>
              <Link className={secondaryLinkClassName} href="#cara-kerja">
                Lihat cara kerjanya
              </Link>
            </div>
          </div>

          <ProductPreviewComposition />
        </div>
      </section>

      <section
        aria-labelledby="capability-title"
        className="border-seraya-border-default/80 bg-seraya-surface border-y"
      >
        <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
          <div className="max-w-2xl">
            <p className="text-seraya-action-primary text-sm font-semibold tracking-[0.13em] uppercase">
              Untuk momen yang lebih tertata
            </p>
            <h2 id="capability-title" className="seraya-display-md mt-4">
              Semua yang dibutuhkan untuk membagikan undangan dengan lebih personal.
            </h2>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {capabilities.map((capability) => (
              <article
                key={capability.number}
                className="border-seraya-border-default bg-seraya-canvas rounded-[var(--seraya-radius-lg)] border p-6"
              >
                <span className="text-seraya-action-primary text-xs font-semibold tracking-[0.12em] uppercase">
                  {capability.number}
                </span>
                <h3 className="text-seraya-text-primary mt-6 font-serif text-2xl leading-tight tracking-[-0.025em]">
                  {capability.title}
                </h3>
                <p className="text-seraya-text-secondary mt-3 text-sm leading-6">
                  {capability.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="cara-kerja" aria-labelledby="how-it-works-title" className="scroll-mt-6">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16 lg:px-10 lg:py-28">
          <div className="max-w-xl">
            <p className="text-seraya-action-primary text-sm font-semibold tracking-[0.13em] uppercase">
              Cara kerja
            </p>
            <h2 id="how-it-works-title" className="seraya-display-md mt-4">
              Dari detail pertama sampai undangan siap dibagikan.
            </h2>
            <p className="text-seraya-text-secondary mt-5 max-w-md text-base leading-7">
              Seraya menjaga alurnya tetap jelas: kalian mengatur draft pribadi terlebih dahulu,
              lalu menerbitkan versi publik saat benar-benar siap.
            </p>
          </div>

          <ol className="border-seraya-border-default divide-seraya-border-default bg-seraya-surface divide-y overflow-hidden rounded-[var(--seraya-radius-xl)] border shadow-[var(--seraya-shadow-soft)]">
            {steps.map((step, index) => (
              <li
                key={step.title}
                className="grid gap-4 p-5 sm:grid-cols-[2.5rem_minmax(0,1fr)] sm:gap-5 sm:p-6"
              >
                <span className="bg-seraya-brand-soft text-seraya-action-primary inline-flex size-10 items-center justify-center rounded-full text-sm font-semibold">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 className="text-seraya-text-primary text-lg font-semibold tracking-[-0.02em]">
                    {step.title}
                  </h3>
                  <p className="text-seraya-text-secondary mt-1.5 text-sm leading-6">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-label="Kejelasan privasi dan penerbitan" className="bg-seraya-soft">
        <div className="mx-auto grid w-full max-w-7xl gap-px px-5 py-5 sm:grid-cols-3 sm:px-8 lg:px-10">
          {trustStatements.map((statement) => (
            <p
              key={statement}
              className="text-seraya-text-secondary border-seraya-border-default/80 border-b py-4 text-sm leading-6 last:border-b-0 sm:border-r sm:border-b-0 sm:px-6 sm:first:pl-0 sm:last:border-r-0 sm:last:pr-0"
            >
              {statement}
            </p>
          ))}
        </div>
      </section>

      <section aria-labelledby="final-cta-title">
        <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-10 lg:py-28">
          <div className="bg-seraya-ink relative overflow-hidden rounded-[var(--seraya-radius-xl)] px-6 py-12 text-center sm:px-12 sm:py-16">
            <div
              aria-hidden="true"
              className="bg-seraya-rosewood/50 absolute top-[-7rem] right-[-6rem] size-60 rounded-full blur-3xl"
            />
            <div
              aria-hidden="true"
              className="bg-seraya-sage/35 absolute bottom-[-8rem] left-[-5rem] size-64 rounded-full blur-3xl"
            />
            <div className="relative mx-auto max-w-2xl">
              <p className="text-seraya-sand text-sm font-semibold tracking-[0.13em] uppercase">
                Mulai dengan tenang
              </p>
              <h2
                id="final-cta-title"
                className="mt-4 font-serif text-4xl leading-[1.02] tracking-[-0.04em] text-white sm:text-5xl"
              >
                Siap mulai menyusun undangan kalian?
              </h2>
              <p className="mt-5 text-base leading-7 text-white/75 sm:text-lg">
                Buat draft pribadi, lengkapi detailnya, lalu terbitkan saat undangan kalian siap
                dibagikan.
              </p>
              <Link
                className="text-seraya-ink hover:bg-seraya-sand mt-8 inline-flex min-h-12 items-center justify-center rounded-[var(--seraya-radius-md)] bg-white px-5 text-base font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-white"
                href="/dashboard/new"
              >
                Mulai buat undangan
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-seraya-border-default border-t">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          <Link
            className="text-seraya-text-primary focus-visible:outline-seraya-focus-ring font-serif text-xl tracking-[-0.03em] focus-visible:outline-3 focus-visible:outline-offset-3"
            href="/"
          >
            Seraya
          </Link>
          <nav
            aria-label="Navigasi footer"
            className="flex flex-wrap gap-x-5 gap-y-3 text-sm font-semibold"
          >
            <Link
              className="text-seraya-text-secondary hover:text-seraya-text-primary focus-visible:outline-seraya-focus-ring transition-colors focus-visible:outline-3 focus-visible:outline-offset-3"
              href="/login"
            >
              Masuk
            </Link>
            <Link
              className="text-seraya-text-secondary hover:text-seraya-text-primary focus-visible:outline-seraya-focus-ring transition-colors focus-visible:outline-3 focus-visible:outline-offset-3"
              href="/dashboard/new"
            >
              Mulai buat undangan
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
