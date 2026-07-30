import type { Metadata } from 'next';
import Link from 'next/link';

import {
  CollectionCard,
  FlagshipFooter,
  FlagshipHeader,
  InvitationCover,
  flagshipCollections,
} from '@/components/marketing/flagship-marketing';

export const dynamic = 'force-static';
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Koleksi undangan',
  description:
    'Bandingkan Roselle, Aruna, dan Laras melalui showroom renderer asli dengan satu pasangan demo yang sama.',
};

const comparison = [
  ['Suasana', 'Hangat dan romantis', 'Modern dan editorial', 'Formal dan tenang'],
  ['Komposisi', 'Lembut dan mengalir', 'Asimetris dan tegas', 'Terpusat dan elegan'],
  ['Media', 'Natural dan botanical', 'Arsitektural dan directional', 'Malam dan refined'],
  [
    'Cocok untuk',
    'Perayaan intim dan hangat',
    'Pasangan modern dan ekspresif',
    'Perayaan formal dan malam hari',
  ],
] as const;

const showroomPrinciples = [
  {
    title: 'Satu pasangan demo',
    description:
      'Kirana dan Arga memakai isi, acara, galeri, dan kepadatan yang sama agar perbandingan antarkoleksi tetap jujur.',
  },
  {
    title: 'Renderer produksi',
    description:
      'Setiap pratinjau berasal dari renderer Roselle, Aruna, dan Laras yang sama dengan undangan sebenarnya—bukan layout marketing terpisah.',
  },
  {
    title: 'Dua permukaan aman',
    description:
      'Undangan umum dan simulasi personal tersedia sebagai data fiktif statis. RSVP dan ucapan demo tidak disimpan.',
  },
] as const;

export default function TemplatesPage() {
  return (
    <div className="bg-seraya-canvas min-h-screen overflow-x-hidden">
      <FlagshipHeader />

      <main>
        <section className="border-seraya-border-default bg-seraya-surface border-b">
          <div className="mx-auto grid w-full max-w-[90rem] gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:items-end lg:gap-16 lg:px-10 lg:py-24">
            <div>
              <p className="seraya-eyebrow text-seraya-action-primary">Showroom Seraya</p>
              <h1 className="text-seraya-text-primary mt-5 font-serif text-[clamp(4rem,8vw,8rem)] leading-[0.8] font-medium tracking-[-0.07em]">
                Pilih rasa,
                <span className="text-seraya-action-primary block italic">
                  lihat hasil nyatanya.
                </span>
              </h1>
            </div>
            <div className="max-w-xl lg:justify-self-end">
              <p className="text-seraya-text-secondary text-base leading-7 sm:text-lg sm:leading-8">
                Roselle, Aruna, dan Laras kini dibandingkan memakai undangan Kirana &amp; Arga yang
                sama. Fungsi dan isi tetap setara—karakter presentasinya yang berbeda.
              </p>
              <Link className="seraya-button-primary mt-7 min-h-12 px-6" href="/dashboard/new">
                Mulai buat undangan
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </section>

        <section
          aria-label="Pratinjau tiga koleksi dari renderer asli"
          className="mx-auto w-full max-w-[90rem] px-5 py-16 sm:px-8 sm:py-20 lg:px-10 lg:py-24"
        >
          <div className="mb-10 max-w-3xl sm:mb-14">
            <p className="seraya-eyebrow text-seraya-action-primary">Kirana &amp; Arga</p>
            <h2 className="seraya-display-md mt-4">Satu isi undangan. Tiga cara menyambut tamu.</h2>
            <p className="text-seraya-text-secondary mt-5 max-w-2xl text-base leading-7">
              Bingkai di bawah memuat pembuka dari renderer produksi. Buka demo lengkap untuk
              menelusuri acara, galeri, Amplop Digital, serta simulasi perjalanan personal.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {flagshipCollections.map((collection) => (
              <article className="min-w-0" key={collection.key}>
                <InvitationCover collection={collection.key} compact />
                <div className="pt-6">
                  <p className="seraya-eyebrow text-seraya-action-primary">
                    {collection.personality}
                  </p>
                  <h2 className="text-seraya-text-primary mt-2 font-serif text-4xl leading-none font-medium tracking-[-0.04em]">
                    {collection.name}
                  </h2>
                  <p className="text-seraya-text-secondary mt-3 text-sm leading-6">
                    {collection.description}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
                    <Link
                      className="text-seraya-action-primary inline-flex min-h-11 items-center gap-2"
                      href={`/templates/${collection.key}/demo/generic`}
                    >
                      Buka demo umum
                      <span aria-hidden="true">→</span>
                    </Link>
                    <Link
                      className="text-seraya-text-secondary inline-flex min-h-11 items-center"
                      href={`/templates/${collection.key}/demo/personal`}
                    >
                      Simulasi personal
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-seraya-ink text-white" aria-labelledby="showroom-method-title">
          <div className="mx-auto w-full max-w-[90rem] px-5 py-18 sm:px-8 sm:py-22 lg:px-10 lg:py-28">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-start lg:gap-16">
              <div>
                <p className="text-seraya-sand text-xs font-semibold tracking-[0.18em] uppercase">
                  Perbandingan yang dapat dipercaya
                </p>
                <h2
                  id="showroom-method-title"
                  className="mt-5 max-w-2xl font-serif text-[clamp(3rem,6vw,5.4rem)] leading-[0.88] font-medium tracking-[-0.055em]"
                >
                  Kualitas template tidak lagi disamarkan oleh pasangan atau foto yang berbeda.
                </h2>
              </div>
              <div className="divide-y divide-white/14 border-y border-white/14">
                {showroomPrinciples.map((principle, index) => (
                  <article
                    className="grid gap-3 py-6 sm:grid-cols-[3rem_minmax(0,1fr)] sm:gap-5"
                    key={principle.title}
                  >
                    <p className="text-seraya-sand text-xs font-semibold tracking-[0.14em]">
                      {String(index + 1).padStart(2, '0')}
                    </p>
                    <div>
                      <h3 className="font-serif text-2xl font-medium">{principle.title}</h3>
                      <p className="mt-3 max-w-xl text-sm leading-7 text-white/70">
                        {principle.description}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-seraya-soft" aria-labelledby="collection-stories-title">
          <div className="mx-auto w-full max-w-[90rem] px-5 py-20 sm:px-8 sm:py-24 lg:px-10 lg:py-32">
            <div className="max-w-3xl">
              <p className="seraya-eyebrow text-seraya-action-primary">Tiga arah yang jelas</p>
              <h2 id="collection-stories-title" className="seraya-display-lg mt-4">
                Setiap koleksi menjaga fungsi yang sama, tetapi bercerita dengan caranya sendiri.
              </h2>
            </div>
            <div className="mt-14 space-y-16 lg:mt-20 lg:space-y-24">
              {flagshipCollections.map((collection, index) => (
                <CollectionCard
                  collection={collection}
                  key={collection.key}
                  priority={index % 2 === 1}
                />
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="comparison-title">
          <div className="mx-auto w-full max-w-[90rem] px-5 py-20 sm:px-8 sm:py-24 lg:px-10 lg:py-32">
            <div className="max-w-3xl">
              <p className="seraya-eyebrow text-seraya-action-primary">Perbandingan karakter</p>
              <h2 id="comparison-title" className="seraya-display-md mt-4">
                Temukan koleksi yang paling dekat dengan suasana pernikahan kalian.
              </h2>
            </div>

            <div className="border-seraya-border-default mt-10 overflow-hidden rounded-[1.5rem] border sm:mt-14">
              <div className="bg-seraya-ink hidden grid-cols-[0.7fr_repeat(3,1fr)] text-white md:grid">
                <div className="p-5" />
                {flagshipCollections.map((collection) => (
                  <div
                    className="border-l border-white/12 p-5 font-serif text-2xl"
                    key={collection.key}
                  >
                    {collection.name}
                  </div>
                ))}
              </div>
              <div className="divide-seraya-border-default divide-y">
                {comparison.map(([label, roselle, aruna, laras]) => (
                  <div
                    className="bg-seraya-surface grid md:grid-cols-[0.7fr_repeat(3,1fr)]"
                    key={label}
                  >
                    <div className="bg-seraya-soft p-5 text-sm font-semibold">{label}</div>
                    {[roselle, aruna, laras].map((value, index) => (
                      <div
                        className="border-seraya-border-default border-t p-5 text-sm leading-6 md:border-t-0 md:border-l"
                        key={`${label}-${index}`}
                      >
                        <span className="text-seraya-text-muted mb-1 block text-xs font-semibold uppercase md:hidden">
                          {flagshipCollections[index]?.name}
                        </span>
                        {value}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section
          className="px-5 pb-20 sm:px-8 sm:pb-24 lg:px-10 lg:pb-32"
          aria-labelledby="templates-final-title"
        >
          <div className="bg-seraya-ink mx-auto max-w-[90rem] rounded-[2rem] px-6 py-16 text-center text-white sm:px-12 sm:py-20">
            <p className="text-seraya-sand text-xs font-semibold tracking-[0.18em] uppercase">
              Tidak harus langsung sempurna
            </p>
            <h2
              id="templates-final-title"
              className="mx-auto mt-5 max-w-3xl font-serif text-[clamp(3rem,6vw,5.5rem)] leading-[0.86] font-medium tracking-[-0.055em]"
            >
              Pilih arah awalnya. Seluruh detail masih dapat kalian lanjutkan.
            </h2>
            <Link
              className="mt-8 inline-flex min-h-13 items-center justify-center gap-2 rounded-[var(--seraya-radius-pill)] bg-white px-6 font-semibold text-[var(--seraya-ink)] transition-transform hover:-translate-y-0.5"
              href="/dashboard/new"
            >
              Buat draf pribadi
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </main>

      <FlagshipFooter />
    </div>
  );
}
