import Link from 'next/link';

import { InvitationCover } from '@/components/marketing/flagship-marketing';
import { siteConfig } from '@/config/site';

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="bg-seraya-canvas min-h-screen">
      <div className="mx-auto grid min-h-screen w-full max-w-[100rem] lg:grid-cols-[minmax(24rem,0.92fr)_minmax(30rem,1.08fr)]">
        <section className="bg-seraya-ink relative isolate hidden overflow-hidden px-10 py-10 text-white lg:flex lg:flex-col xl:px-14 xl:py-12">
          <div
            aria-hidden="true"
            className="bg-seraya-rosewood/55 absolute -top-32 -right-28 -z-10 size-80 rounded-full blur-3xl"
          />
          <div
            aria-hidden="true"
            className="bg-seraya-sage/30 absolute -bottom-44 -left-32 -z-10 size-96 rounded-full blur-3xl"
          />

          <Link className="font-serif text-3xl font-medium tracking-[-0.045em]" href="/">
            {siteConfig.name}
          </Link>

          <div className="my-auto grid grid-cols-[minmax(0,1fr)_14rem] items-center gap-8 py-10">
            <div>
              <p className="text-seraya-sand text-xs font-semibold tracking-[0.18em] uppercase">
                Ruang pribadi pasangan
              </p>
              <h1 className="mt-5 max-w-xl font-serif text-[clamp(3.5rem,5vw,5.8rem)] leading-[0.84] font-medium tracking-[-0.06em]">
                Lanjutkan undangan kalian dengan tenang.
              </h1>
              <p className="mt-6 max-w-md text-base leading-7 text-white/68">
                Draf, data tamu, tautan personal, RSVP, dan ucapan tetap berada dalam satu workspace
                yang terkontrol.
              </p>
            </div>
            <div className="rotate-[3deg]">
              <InvitationCover collection="laras" compact />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 border-t border-white/14 pt-5 text-xs leading-5 text-white/62">
            <p>Draf tetap pribadi sebelum diterbitkan.</p>
            <p>Tautan personal terpisah untuk setiap tamu.</p>
            <p>Perubahan publik tetap dalam kontrol kalian.</p>
          </div>
        </section>

        <section className="flex min-h-screen items-center px-5 py-8 sm:px-8 sm:py-12 lg:px-12 xl:px-18">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8 flex items-center justify-between gap-5 lg:hidden">
              <Link
                className="text-seraya-text-primary font-serif text-3xl font-medium tracking-[-0.045em]"
                href="/"
              >
                {siteConfig.name}
              </Link>
              <Link className="seraya-marketing-nav-link" href="/templates">
                Lihat koleksi
              </Link>
            </div>
            {children}
            <p className="text-seraya-text-muted mt-7 text-center text-xs leading-5">
              Dengan melanjutkan, kalian masuk ke ruang pribadi untuk mengelola undangan dan data
              tamu.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
