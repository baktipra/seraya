import Link from 'next/link';

import styles from './homepage-theme-grid.module.css';
import { ThemeCard } from './theme-card';
import { featuredThemes } from './theme-catalog';

export function HomepageThemeGrid() {
  return (
    <section
      aria-labelledby="collection-title"
      className={`${styles.grid} scroll-mt-24`}
      data-homepage-theme-grid
      id="koleksi"
    >
      <div className="px-5 py-16 sm:px-8 sm:py-20 lg:px-10 lg:py-24">
        <div className="grid gap-7 lg:grid-cols-[minmax(0,0.9fr)_minmax(18rem,0.55fr)] lg:items-end">
          <div>
            <p className="seraya-eyebrow text-seraya-action-primary">Tema pilihan Seraya</p>
            <h2 id="collection-title" className="seraya-display-lg mt-4 max-w-3xl">
              Pilih yang paling terasa kalian.
            </h2>
          </div>
          <div className="lg:justify-self-end">
            <p className="text-seraya-text-secondary max-w-lg text-base leading-7">
              Coba warna langsung di setiap kartu, buka preview lengkap, lalu mulai dari tema yang
              paling cocok dengan vibe pernikahan kalian.
            </p>
            <p className="text-seraya-text-muted mt-3 text-xs font-semibold tracking-[0.1em] uppercase">
              3 tema siap dipakai · koleksi terus bertambah
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:mt-12 xl:grid-cols-3">
          {featuredThemes.map((theme) => (
            <ThemeCard key={theme.key} theme={theme} />
          ))}
        </div>

        <div className="border-seraya-border-default mt-10 flex flex-col items-start justify-between gap-4 border-t pt-6 sm:flex-row sm:items-center">
          <p className="text-seraya-text-secondary max-w-xl text-sm leading-6">
            Homepage hanya menampilkan pilihan unggulan. Katalog lengkap dan filter tema akan hidup
            di halaman koleksi.
          </p>
          <Link className="seraya-button-secondary min-h-12 px-6" href="/templates">
            Lihat semua tema <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
