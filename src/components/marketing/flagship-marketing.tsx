import type { Route } from 'next';
import Link from 'next/link';

import { siteConfig } from '@/config/site';

import styles from './flagship-marketing.module.css';

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
      'Formal, tenang, dan berakar pada keramahan Indonesia. Komposisi malam yang halus untuk perayaan elegan.',
    mood: 'Evening ceremony · antique gold · restrained heritage geometry',
  },
] as const;

const previewCopy: Record<
  FlagshipCollectionKey,
  {
    eyebrow: string;
    date: string;
    guestLine: string;
    guestName: string;
    stageLabel: string;
    showMonogram?: boolean;
  }
> = {
  roselle: {
    eyebrow: 'The wedding of',
    date: '17 Agustus 2027',
    guestLine: 'Undangan personal telah disiapkan untuk',
    guestName: 'Bapak Aditya & Keluarga',
    stageLabel: 'Romantic warmth',
  },
  aruna: {
    eyebrow: 'Wedding journal · 017',
    date: 'Jakarta · 17.08.27',
    guestLine: 'Personal edition prepared for',
    guestName: 'Aditya & Family',
    stageLabel: 'Modern editorial',
  },
  laras: {
    eyebrow: 'A formal evening',
    date: 'Sabtu · 17 Agustus 2027',
    guestLine: 'Dengan hormat mengundang',
    guestName: 'Bapak Aditya sekeluarga',
    stageLabel: 'Formal evening',
    showMonogram: true,
  },
};

const previewClassByCollection: Record<FlagshipCollectionKey, string> = {
  roselle: styles.roselle,
  aruna: styles.aruna,
  laras: styles.laras,
};

const collectionOrdinal: Record<FlagshipCollectionKey, string> = {
  roselle: '01',
  aruna: '02',
  laras: '03',
};

export function getShowroomHref(
  collection: FlagshipCollectionKey,
  surface: 'generic' | 'personal',
): Route {
  return `/templates/${collection}/demo/${surface}` as Route;
}

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
          <Link
            className="seraya-button-primary min-h-11 px-4 text-sm sm:px-5"
            href="/dashboard/new"
          >
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
        <nav
          aria-label="Navigasi footer"
          className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold"
        >
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
  const copy = previewCopy[collection];

  return (
    <div
      aria-label={`Preview artistik koleksi ${collection}: undangan Kirana dan Arga, sapaan personal, dan konfirmasi kehadiran`}
      className={`${styles.preview} ${previewClassByCollection[collection]} ${compact ? styles.compact : ''}`}
      data-marketing-invitation-preview={collection}
      role="img"
    >
      <div aria-hidden="true" className={styles.motif} />
      <div aria-hidden="true">
        <p className={styles.stageLabel}>{copy.stageLabel}</p>

        <div className={`${styles.floatingCard} ${styles.guestCard}`}>
          <p className={styles.floatingEyebrow}>Sapaan tamu</p>
          <p className={styles.floatingTitle}>{copy.guestName}</p>
          <p className={styles.floatingMeta}>{copy.guestLine}</p>
        </div>

        <div className={styles.phone}>
          <div className={styles.phoneContent}>
            <p className={styles.phoneEyebrow}>{copy.eyebrow}</p>
            {copy.showMonogram ? <span className={styles.monogram}>KA</span> : null}
            <p className={styles.phoneNames}>Kirana &amp; Arga</p>
            <p className={styles.phoneCopy}>
              Dengan penuh syukur, kami mengundang Anda untuk hadir dalam perayaan keluarga dan awal
              perjalanan baru kami.
            </p>
            <p className={styles.phoneDate}>{copy.date}</p>
            <span className={styles.phoneRule}>
              <span />
            </span>
          </div>
        </div>

        <div className={`${styles.floatingCard} ${styles.responseCard}`}>
          <p className={styles.floatingEyebrow}>Konfirmasi tamu</p>
          <p className={styles.floatingTitle}>Apakah Anda hadir?</p>
          <div className={styles.responseOptions}>
            <span className={`${styles.responseOption} ${styles.responseOptionActive}`}>Hadir</span>
            <span className={styles.responseOption}>Belum pasti</span>
          </div>
        </div>

        <div className={styles.previewFooter}>
          <span>Product preview</span>
          <span>Kirana &amp; Arga</span>
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
    <article
      className={`${styles.collectionArticle} ${priority ? styles.collectionArticleReversed : ''}`}
    >
      <div className={styles.collectionPreview}>
        <InvitationCover collection={collection.key} compact />
      </div>
      <div className={styles.collectionCopy}>
        <p className={styles.collectionIndex}>
          {collectionOrdinal[collection.key]} · {collection.personality}
        </p>
        <h3 className="text-seraya-text-primary mt-5 font-serif text-[clamp(3.2rem,5vw,5.4rem)] leading-[0.82] font-medium tracking-[-0.06em]">
          {collection.name}
        </h3>
        <p className="text-seraya-text-secondary mt-6 max-w-xl text-base leading-7 sm:text-lg sm:leading-8">
          {collection.description}
        </p>
        <p className="text-seraya-text-muted mt-5 text-xs font-semibold tracking-[0.1em] uppercase">
          {collection.mood}
        </p>
        <div className={styles.collectionActions}>
          <Link
            className="text-seraya-action-primary inline-flex min-h-11 items-center gap-2 text-sm font-semibold transition-[gap] hover:gap-3"
            href={getShowroomHref(collection.key, 'generic')}
          >
            Lihat undangan umum
            <span aria-hidden="true">→</span>
          </Link>
          <Link
            className="text-seraya-text-secondary hover:text-seraya-text-primary inline-flex min-h-11 items-center gap-2 text-sm font-semibold transition-colors"
            href={getShowroomHref(collection.key, 'personal')}
          >
            Simulasi personal
          </Link>
        </div>
        <Link
          className="seraya-button-secondary mt-6 min-h-11 w-fit px-5 text-sm"
          href="/dashboard/new"
        >
          Mulai dengan {collection.name}
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}
