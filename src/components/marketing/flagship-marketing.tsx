import Link from 'next/link';

import { siteConfig } from '@/config/site';

export type FlagshipCollectionKey = 'roselle' | 'aruna' | 'laras';

export const flagshipCollections = [
  {
    key: 'roselle',
    name: 'Roselle',
    personality: 'Romantic warmth',
    description:
      'Hangat, lembut, dan intim. Dibangun untuk perjalanan undangan yang terasa seperti surat personal.',
    mood: 'Botanical softness · warm editorial · intimate rhythm',
  },
  {
    key: 'aruna',
    name: 'Aruna',
    personality: 'Modern editorial',
    description:
      'Berani tetapi tetap tenang. Grid editorial, tipografi tegas, dan ruang putih yang terasa modern.',
    mood: 'Editorial grid · directional type · refined contrast',
  },
  {
    key: 'laras',
    name: 'Laras',
    personality: 'Formal evening',
    description:
      'Formal, elegan, dan seremonial. Komposisi malam yang tenang untuk perayaan dengan nuansa berkelas.',
    mood: 'Evening ceremony · fine borders · restrained ornament',
  },
] as const;

const collectionStyles: Record<
  FlagshipCollectionKey,
  {
    canvas: string;
    frame: string;
    accent: string;
    quiet: string;
    text: string;
  }
> = {
  roselle: {
    canvas: 'bg-[#f6e8e7]',
    frame: 'border-[#d9b9b7] bg-[#fffaf7]',
    accent: 'text-[#8e4b52]',
    quiet: 'text-[#795f5d]',
    text: 'text-[#392c2b]',
  },
  aruna: {
    canvas: 'bg-[#e9e7df]',
    frame: 'border-[#b9b5aa] bg-[#f8f7f2]',
    accent: 'text-[#5a625d]',
    quiet: 'text-[#6d6b65]',
    text: 'text-[#252724]',
  },
  laras: {
    canvas: 'bg-[#201f26]',
    frame: 'border-[#6f6558] bg-[#2b2931]',
    accent: 'text-[#d7b982]',
    quiet: 'text-[#c9c0b4]',
    text: 'text-[#fff9ed]',
  },
};

export function FlagshipHeader() {
  return (
    <header className="border-seraya-border-default/70 bg-seraya-canvas/88 sticky top-0 z-50 border-b backdrop-blur-xl">
      <nav
        aria-label="Navigasi utama"
        className="mx-auto flex min-h-[4.5rem] w-full max-w-[90rem] items-center justify-between gap-5 px-5 sm:px-8 lg:px-10"
      >
        <Link
          aria-label="Seraya, kembali ke beranda"
          className="text-seraya-text-primary font-serif text-[1.9rem] font-medium tracking-[-0.045em] focus-visible:rounded-sm"
          href="/"
        >
          {siteConfig.name}
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          <Link className="seraya-marketing-nav-link" href="/templates">
            Koleksi
          </Link>
          <Link className="seraya-marketing-nav-link" href="/#cara-kerja">
            Cara kerja
          </Link>
          <Link className="seraya-marketing-nav-link" href="/#untuk-indonesia">
            Untuk Indonesia
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link className="seraya-marketing-nav-link px-2" href="/login">
            Masuk
          </Link>
          <Link className="seraya-button-primary min-h-11 px-4 text-sm sm:px-5" href="/dashboard/new">
            Mulai
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </nav>
    </header>
  );
}

export function FlagshipFooter() {
  return (
    <footer className="border-seraya-border-default bg-seraya-ink border-t text-white">
      <div className="mx-auto grid w-full max-w-[90rem] gap-10 px-5 py-12 sm:px-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-end lg:px-10 lg:py-16">
        <div>
          <Link className="font-serif text-3xl tracking-[-0.04em]" href="/">
            {siteConfig.name}
          </Link>
          <p className="mt-4 max-w-md text-sm leading-6 text-white/68">
            Platform pengalaman tamu pernikahan Indonesia yang personal, indah, dan mudah dikelola.
          </p>
        </div>
        <nav aria-label="Navigasi footer" className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold">
          <Link className="text-white/70 transition-colors hover:text-white" href="/templates">
            Koleksi
          </Link>
          <Link className="text-white/70 transition-colors hover:text-white" href="/login">
            Masuk
          </Link>
          <Link className="text-white/70 transition-colors hover:text-white" href="/dashboard/new">
            Buat undangan
          </Link>
        </nav>
      </div>
    </footer>
  );
}

export function InvitationCover({
  collection,
  compact = false,
}: {
  collection: FlagshipCollectionKey;
  compact?: boolean;
}) {
  const style = collectionStyles[collection];
  const names = collection === 'aruna' ? ['Nadia', 'Raka'] : collection === 'laras' ? ['Alya', 'Dimas'] : ['Mira', 'Arga'];

  return (
    <div
      aria-label={`Pratinjau koleksi ${collection}`}
      className={`${style.canvas} relative isolate overflow-hidden rounded-[1.75rem] p-4 shadow-[0_28px_70px_rgb(43_37_35_/_0.13)] sm:p-5`}
    >
      <div
        aria-hidden="true"
        className="absolute -top-16 -right-12 size-44 rounded-full border border-current opacity-15"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-24 -left-20 size-52 rounded-full border border-current opacity-10"
      />
      <div
        className={`${style.frame} ${style.text} relative mx-auto flex aspect-[9/16] w-full max-w-[18rem] flex-col overflow-hidden rounded-[1.35rem] border px-6 py-7 text-center shadow-[0_18px_45px_rgb(35_28_25_/_0.14)] ${compact ? 'max-h-[28rem]' : ''}`}
      >
        <p className={`${style.accent} text-[0.58rem] font-semibold tracking-[0.24em] uppercase`}>
          The wedding of
        </p>
        <div className="my-auto">
          {collection === 'aruna' ? (
            <div className="text-left">
              <p className="text-[0.65rem] font-semibold tracking-[0.18em] uppercase opacity-60">Saturday</p>
              <p className="mt-4 font-serif text-[3.7rem] leading-[0.74] tracking-[-0.07em]">{names[0]}</p>
              <p className={`${style.accent} my-3 text-2xl italic`}>&amp;</p>
              <p className="ml-10 font-serif text-[3.7rem] leading-[0.74] tracking-[-0.07em]">{names[1]}</p>
            </div>
          ) : (
            <>
              <p className="font-serif text-[3.45rem] leading-[0.78] font-medium tracking-[-0.055em]">
                {names[0]}
              </p>
              <p className={`${style.accent} my-3 font-serif text-2xl italic`}>&amp;</p>
              <p className="font-serif text-[3.45rem] leading-[0.78] font-medium tracking-[-0.055em]">
                {names[1]}
              </p>
            </>
          )}
        </div>
        <div className={`${style.quiet} border-t border-current/20 pt-5`}>
          <p className="text-[0.62rem] font-semibold tracking-[0.18em] uppercase">12 · 12 · 2026</p>
          <p className="mt-2 text-[0.68rem]">Jakarta, Indonesia</p>
        </div>
      </div>
    </div>
  );
}

export function CollectionCard({
  collection,
  priority = false,
}: {
  collection: (typeof flagshipCollections)[number];
  priority?: boolean;
}) {
  return (
    <article className="group grid min-w-0 gap-6 border-t border-[var(--seraya-border-default)] pt-7 lg:grid-cols-[minmax(15rem,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:gap-10">
      <div className={priority ? 'lg:order-2' : undefined}>
        <InvitationCover collection={collection.key} compact />
      </div>
      <div className={priority ? 'lg:order-1' : undefined}>
        <p className="seraya-eyebrow text-seraya-action-primary">{collection.personality}</p>
        <h3 className="text-seraya-text-primary mt-3 font-serif text-[clamp(2.8rem,5vw,4.8rem)] leading-[0.88] font-medium tracking-[-0.05em]">
          {collection.name}
        </h3>
        <p className="text-seraya-text-secondary mt-5 max-w-xl text-base leading-7">
          {collection.description}
        </p>
        <p className="text-seraya-text-muted mt-4 text-xs font-semibold tracking-[0.1em] uppercase">
          {collection.mood}
        </p>
        <Link
          className="text-seraya-action-primary mt-7 inline-flex min-h-11 items-center gap-2 text-sm font-semibold transition-[gap] group-hover:gap-3"
          href="/dashboard/new"
        >
          Mulai dengan {collection.name}
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}
