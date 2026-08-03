import type { Metadata } from 'next';
import Link from 'next/link';

import { EditorialHero } from '@/components/marketing/editorial-hero';
import {
  CollectionCard,
  FlagshipFooter,
  FlagshipHeader,
  flagshipCollections,
} from '@/components/marketing/flagship-marketing';

export const dynamic = 'force-static';
export const revalidate = 3600;

export const metadata: Metadata = {
  title: {
    absolute: 'Seraya — Pengalaman tamu pernikahan yang personal',
  },
  description:
    'Buat undangan pernikahan digital dengan tautan personal, RSVP keluarga, dan pengelolaan tamu dalam satu workspace yang tenang.',
};

const ownerJourney = [
  {
    number: '01',
    title: 'Pilih pengalaman',
    description:
      'Mulai dari Roselle, Aruna, atau Laras—tiga koleksi dengan karakter yang benar-benar berbeda.',
  },
  {
    number: '02',
    title: 'Susun dengan tenang',
    description:
      'Lengkapi cerita, acara, lokasi, galeri, dan detail penting sambil melihat arah hasilnya.',
  },
  {
    number: '03',
    title: 'Terbitkan saat siap',
    description:
      'Seraya membantu menunjukkan bagian yang belum lengkap sebelum undangan dibagikan.',
  },
  {
    number: '04',
    title: 'Bagikan secara personal',
    description:
      'Siapkan tautan untuk tiap tamu, bagikan melalui WhatsApp, lalu terima RSVP dan ucapan.',
  },
] as const;

const indonesiaProof = [
  {
    title: 'WhatsApp-first',
    description:
      'Tautan dan pesan personal disiapkan untuk cara pasangan Indonesia benar-benar mengundang tamu.',
  },
  {
    title: 'Keluarga dan rombongan',
    description:
      'Konfirmasi kehadiran memahami jumlah rombongan, bukan hanya satu respons individual.',
  },
  {
    title: 'Banyak rangkaian acara',
    description:
      'Akad, resepsi, pemberkatan, ngunduh mantu, sangjit, dan acara lain dapat hidup dalam satu undangan.',
  },
  {
    title: 'Dibuka nyaman dari HP',
    description:
      'Pengalaman tamu dirancang mobile-first untuk dibuka langsung dari percakapan WhatsApp.',
  },
  {
    title: 'Persiapan tamu dengan Excel',
    description:
      'Import dan export mengikuti format kerja yang sudah akrab bagi pasangan, keluarga, dan panitia.',
  },
  {
    title: 'Amplop Digital',
    description:
      'Informasi hadiah dapat disusun secara sopan di dalam perjalanan undangan, bukan terasa seperti transaksi.',
  },
] as const;

const faqs = [
  {
    question: 'Apakah setiap tamu bisa mendapat undangan yang berbeda?',
    answer:
      'Ya. Seraya menyiapkan tautan personal untuk tiap tamu, lengkap dengan sapaan dan akses respons yang sesuai.',
  },
  {
    question: 'Apakah undangan bisa diubah setelah dibuat?',
    answer:
      'Bisa. Perubahan tersimpan di draf pribadi dan baru mengubah undangan publik setelah kalian menerbitkannya.',
  },
  {
    question: 'Apakah Seraya mendukung beberapa acara?',
    answer:
      'Ya. Kalian dapat menyusun beberapa rangkaian acara beserta waktu, lokasi, dan petunjuknya.',
  },
  {
    question: 'Bagaimana tamu memberikan konfirmasi kehadiran?',
    answer:
      'Tamu membuka tautan personal, memilih hadir atau tidak, lalu mengisi jumlah rombongan yang dikonfirmasi.',
  },
] as const;

export default function Home() {
  return (
    <div className="bg-seraya-canvas min-h-screen overflow-x-hidden">
      <FlagshipHeader />

      <main>
        <EditorialHero />

        <section id="koleksi" aria-labelledby="collection-title" className="scroll-mt-24">
          <div className="mx-auto w-full max-w-[90rem] px-5 py-20 sm:px-8 sm:py-24 lg:px-10 lg:py-32">
            <div className="grid gap-7 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-end">
              <div>
                <p className="seraya-eyebrow text-seraya-action-primary">Koleksi flagship</p>
                <h2 id="collection-title" className="seraya-display-lg mt-4 max-w-3xl">
                  Bukan sekadar ganti warna. Tiga pengalaman dengan karakter berbeda.
                </h2>
              </div>
              <p className="text-seraya-text-secondary max-w-xl text-base leading-7 lg:justify-self-end">
                Roselle, Aruna, dan Laras memiliki ritme, tipografi, komposisi, dan motion
                sendiri—tanpa mengorbankan fungsi penting undangan personal.
              </p>
            </div>

            <div className="mt-14 space-y-16 lg:mt-20 lg:space-y-24">
              {flagshipCollections.map((collection, index) => (
                <div className="scroll-mt-24" id={`koleksi-${collection.key}`} key={collection.key}>
                  <CollectionCard collection={collection} priority={index % 2 === 1} />
                </div>
              ))}
            </div>

            <div className="mt-14 text-center lg:mt-20">
              <Link className="seraya-button-secondary min-h-12 px-6" href="/templates">
                Bandingkan seluruh koleksi
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </section>

        <section
          id="tautan-personal"
          className="bg-seraya-ink scroll-mt-24 text-white"
          aria-labelledby="personal-journey-title"
        >
          <div className="mx-auto grid w-full max-w-[90rem] gap-12 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:gap-18 lg:px-10 lg:py-32">
            <div>
              <p className="text-seraya-sand text-xs font-semibold tracking-[0.18em] uppercase">
                Dibuat untuk tamu, bukan hanya dilihat owner
              </p>
              <h2
                id="personal-journey-title"
                className="mt-5 max-w-2xl font-serif text-[clamp(3rem,6vw,5.8rem)] leading-[0.88] font-medium tracking-[-0.055em]"
              >
                Setiap tamu menerima perjalanan yang terasa ditujukan untuk mereka.
              </h2>
              <p className="mt-7 max-w-xl text-base leading-7 text-white/70 sm:text-lg sm:leading-8">
                Dari pesan WhatsApp sampai sapaan pembuka, informasi acara, RSVP, dan
                ucapan—semuanya tersusun sebagai satu pengalaman personal.
              </p>
            </div>

            <ol className="divide-y divide-white/14 border-y border-white/14">
              {[
                'Menerima pesan personal di WhatsApp',
                'Membuka undangan dengan sapaan namanya',
                'Memahami acara, lokasi, dan informasi penting',
                'Memberikan konfirmasi kehadiran',
                'Mengirim ucapan tanpa keluar dari perjalanan',
              ].map((item, index) => (
                <li className="grid grid-cols-[2.8rem_minmax(0,1fr)] gap-4 py-5 sm:py-6" key={item}>
                  <span className="text-seraya-sand text-xs font-semibold tracking-[0.14em]">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <p className="text-base leading-7 text-white/84 sm:text-lg">{item}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="cara-kerja" aria-labelledby="owner-journey-title" className="scroll-mt-24">
          <div className="mx-auto w-full max-w-[90rem] px-5 py-20 sm:px-8 sm:py-24 lg:px-10 lg:py-32">
            <div className="max-w-3xl">
              <p className="seraya-eyebrow text-seraya-action-primary">
                Dari ide sampai siap dibagikan
              </p>
              <h2 id="owner-journey-title" className="seraya-display-lg mt-4">
                Alur yang jelas, tanpa memaksa kalian memahami sistem teknis.
              </h2>
            </div>

            <ol className="mt-12 grid gap-px overflow-hidden rounded-[1.5rem] border border-[var(--seraya-border-default)] bg-[var(--seraya-border-default)] md:grid-cols-2 lg:mt-16 lg:grid-cols-4">
              {ownerJourney.map((step) => (
                <li className="bg-seraya-surface min-h-[18rem] p-6 sm:p-8" key={step.number}>
                  <span className="text-seraya-action-primary text-xs font-semibold tracking-[0.16em] uppercase">
                    {step.number}
                  </span>
                  <h3 className="text-seraya-text-primary mt-16 font-serif text-3xl leading-[0.95] font-medium tracking-[-0.035em]">
                    {step.title}
                  </h3>
                  <p className="text-seraya-text-secondary mt-4 text-sm leading-6">
                    {step.description}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          id="untuk-indonesia"
          aria-labelledby="indonesia-title"
          className="bg-seraya-soft scroll-mt-24"
        >
          <div className="mx-auto grid w-full max-w-[90rem] gap-12 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:gap-18 lg:px-10 lg:py-32">
            <div className="max-w-xl">
              <p className="seraya-eyebrow text-seraya-action-primary">Indonesia-first</p>
              <h2 id="indonesia-title" className="seraya-display-lg mt-4">
                Mengikuti cara keluarga Indonesia benar-benar menyiapkan tamu.
              </h2>
              <p className="text-seraya-text-secondary mt-6 text-base leading-7">
                Seraya tidak hanya menerjemahkan produk luar. Alur, bahasa, dan operasionalnya
                dibangun untuk WhatsApp, keluarga besar, rombongan, banyak acara, dan kerja bersama
                panitia.
              </p>
            </div>

            <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
              {indonesiaProof.map((item) => (
                <article className="border-seraya-border-strong border-t pt-5" key={item.title}>
                  <h3 className="text-seraya-text-primary text-base font-semibold">{item.title}</h3>
                  <p className="text-seraya-text-secondary mt-2 text-sm leading-6">
                    {item.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="privacy-title">
          <div className="mx-auto grid w-full max-w-[90rem] gap-10 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-18 lg:px-10 lg:py-32">
            <div className="bg-seraya-brand-soft relative overflow-hidden rounded-[2rem] p-7 sm:p-10 lg:p-12">
              <div
                aria-hidden="true"
                className="border-seraya-action-primary/20 absolute -top-16 -right-12 size-52 rounded-full border"
              />
              <p className="seraya-eyebrow text-seraya-action-primary">
                Kontrol tetap di tangan kalian
              </p>
              <div className="mt-10 space-y-6">
                {[
                  ['Draf pribadi', 'Isi yang sedang dikerjakan belum terlihat oleh tamu.'],
                  ['Undangan publik', 'Hanya versi yang diterbitkan yang tampil pada alamat umum.'],
                  [
                    'Undangan personal',
                    'Sapaan dan respons tamu tetap berada di tautan privatnya.',
                  ],
                ].map(([title, description]) => (
                  <div className="border-seraya-action-primary/18 border-t pt-5" key={title}>
                    <p className="text-seraya-text-primary font-semibold">{title}</p>
                    <p className="text-seraya-text-secondary mt-2 text-sm leading-6">
                      {description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="seraya-eyebrow text-seraya-action-primary">
                Privasi yang dapat dipahami
              </p>
              <h2 id="privacy-title" className="seraya-display-lg mt-4">
                Personal tanpa membuat data tamu menjadi konsumsi publik.
              </h2>
              <p className="text-seraya-text-secondary mt-6 max-w-xl text-base leading-7 sm:text-lg sm:leading-8">
                Seraya memisahkan undangan publik dan pengalaman personal. Tamu hanya melihat
                informasi yang memang ditujukan untuk mereka, sementara owner tetap memiliki kendali
                penerbitan.
              </p>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="pricing-title"
          className="border-seraya-border-default bg-seraya-surface border-y"
        >
          <div className="mx-auto grid w-full max-w-[90rem] gap-10 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:items-center lg:gap-18 lg:px-10 lg:py-28">
            <div>
              <p className="seraya-eyebrow text-seraya-action-primary">Harga yang mudah dipahami</p>
              <h2 id="pricing-title" className="seraya-display-md mt-4">
                Mulai dari satu pengalaman lengkap, bukan daftar add-on yang membingungkan.
              </h2>
            </div>
            <div className="border-seraya-border-default bg-seraya-canvas rounded-[1.5rem] border p-6 sm:p-8">
              <p className="text-seraya-text-muted text-xs font-semibold tracking-[0.14em] uppercase">
                Paket Seraya
              </p>
              <p className="text-seraya-text-primary mt-5 font-serif text-4xl leading-none font-medium">
                Harga segera diumumkan
              </p>
              <p className="text-seraya-text-secondary mt-4 max-w-xl text-sm leading-6">
                Struktur paket final akan mengikuti kemampuan produk yang benar-benar tersedia.
                Tidak ada janji fitur atau batas paket yang belum didukung sistem.
              </p>
              <Link className="seraya-button-primary mt-7 min-h-12 px-5" href="/dashboard/new">
                Buat draf pribadi
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </section>

        <section aria-labelledby="faq-title">
          <div className="mx-auto grid w-full max-w-[90rem] gap-10 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:gap-18 lg:px-10 lg:py-32">
            <div>
              <p className="seraya-eyebrow text-seraya-action-primary">Pertanyaan umum</p>
              <h2 id="faq-title" className="seraya-display-md mt-4">
                Hal penting sebelum mulai.
              </h2>
            </div>
            <div className="divide-seraya-border-default border-seraya-border-default divide-y border-y">
              {faqs.map((faq) => (
                <details className="group py-5 sm:py-6" key={faq.question}>
                  <summary className="text-seraya-text-primary flex min-h-11 cursor-pointer list-none items-center justify-between gap-5 text-base font-semibold marker:hidden">
                    {faq.question}
                    <span
                      aria-hidden="true"
                      className="text-seraya-action-primary text-xl transition-transform group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="text-seraya-text-secondary max-w-2xl pt-3 pr-10 text-sm leading-6">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section
          aria-labelledby="final-cta-title"
          className="px-5 pb-20 sm:px-8 sm:pb-24 lg:px-10 lg:pb-32"
        >
          <div className="bg-seraya-ink relative mx-auto max-w-[90rem] overflow-hidden rounded-[2rem] px-6 py-16 text-center text-white sm:px-12 sm:py-20 lg:py-24">
            <div
              aria-hidden="true"
              className="bg-seraya-rosewood/50 absolute -top-36 -right-28 size-80 rounded-full blur-3xl"
            />
            <div
              aria-hidden="true"
              className="bg-seraya-sage/35 absolute -bottom-44 -left-28 size-96 rounded-full blur-3xl"
            />
            <div className="relative mx-auto max-w-3xl">
              <p className="text-seraya-sand text-xs font-semibold tracking-[0.18em] uppercase">
                Mulai dari kabar bahagianya
              </p>
              <h2
                id="final-cta-title"
                className="mt-5 font-serif text-[clamp(3rem,6vw,6rem)] leading-[0.86] font-medium tracking-[-0.055em]"
              >
                Buat pengalaman yang akan diingat tamu kalian.
              </h2>
              <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-white/70">
                Buat draf pribadi terlebih dahulu. Seluruh detail masih dapat kalian lanjutkan dan
                periksa sebelum diterbitkan.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  className="inline-flex min-h-13 items-center justify-center gap-2 rounded-[var(--seraya-radius-pill)] bg-white px-6 font-semibold text-[var(--seraya-ink)] transition-transform hover:-translate-y-0.5"
                  href="/dashboard/new"
                >
                  Mulai buat undangan
                  <span aria-hidden="true">→</span>
                </Link>
                <Link
                  className="inline-flex min-h-13 items-center justify-center rounded-[var(--seraya-radius-pill)] border border-white/25 px-6 font-semibold text-white transition-colors hover:bg-white/10"
                  href="/templates"
                >
                  Lihat koleksi
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <FlagshipFooter />
    </div>
  );
}
