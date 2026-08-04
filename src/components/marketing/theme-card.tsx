'use client';

import type { CSSProperties } from 'react';
import type { Route } from 'next';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import type { ThemeCatalogItem } from './theme-catalog';

type ThemeCardStyle = CSSProperties & Record<`--theme-${string}`, string>;

function createNativePaletteRules(theme: ThemeCatalogItem) {
  return theme.palettes
    .map(
      (palette) => `
[data-homepage-theme-card="${theme.key}"]:has(input[data-palette-key="${palette.key}"]:checked) {
  --theme-accent: ${palette.accent} !important;
  --theme-canvas: ${palette.canvas} !important;
  --theme-ink: ${palette.ink} !important;
  --theme-paper: ${palette.paper} !important;
  --theme-soft: ${palette.soft} !important;
}`,
    )
    .join('\n');
}

export function ThemeCard({ theme }: { theme: ThemeCatalogItem }) {
  const [paletteKey, setPaletteKey] = useState(theme.palettes[0]?.key ?? 'default');
  const activePalette = useMemo(
    () => theme.palettes.find((palette) => palette.key === paletteKey) ?? theme.palettes[0]!,
    [paletteKey, theme.palettes],
  );
  const themeStyle: ThemeCardStyle = {
    '--theme-accent': activePalette.accent,
    '--theme-canvas': activePalette.canvas,
    '--theme-ink': activePalette.ink,
    '--theme-paper': activePalette.paper,
    '--theme-soft': activePalette.soft,
  };
  const previewHref = `/templates/${theme.key}/demo/generic` as Route;
  const selectHref = `/dashboard/new?template=${theme.key}` as Route;

  return (
    <article
      className="group border-seraya-border-default bg-seraya-surface min-w-0 overflow-hidden rounded-[1.5rem] border shadow-[0_18px_46px_rgb(55_43_39_/_0.08)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:border-[var(--theme-accent)] hover:shadow-[0_26px_58px_rgb(55_43_39_/_0.13)]"
      data-active-palette={activePalette.key}
      data-homepage-theme-card={theme.key}
      data-theme-key={theme.key}
      style={themeStyle}
    >
      <style>{createNativePaletteRules(theme)}</style>

      <div
        aria-label={`Preview tema ${theme.name} dengan warna ${activePalette.name}, kartu undangan Kirana dan Arga, sapaan personal, dan konfirmasi kehadiran`}
        className="relative isolate aspect-[1.18] overflow-hidden bg-[var(--theme-canvas)] text-[var(--theme-ink)] transition-colors duration-300"
        role="img"
      >
        <div
          aria-hidden="true"
          className="absolute -inset-[12%] -z-10 scale-110 rotate-[-4deg] bg-cover bg-center bg-no-repeat opacity-55"
          style={{ backgroundImage: `url("${theme.motif}")` }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_82%_18%,rgb(255_255_255_/_0.7),transparent_28%)]"
        />

        <div
          aria-hidden="true"
          className="absolute top-4 right-4 left-4 z-10 flex items-center justify-between gap-4 text-[0.58rem] font-extrabold tracking-[0.13em] text-[var(--theme-accent)] uppercase"
        >
          <span>{theme.badge}</span>
          <span>{activePalette.name}</span>
        </div>

        <div aria-hidden="true" className="absolute inset-x-4 top-12 bottom-4">
          <div className="absolute top-[12%] left-[1%] z-20 w-[38%] -rotate-5 rounded-[0.85rem] border border-[color-mix(in_srgb,var(--theme-accent)_22%,transparent)] bg-[color-mix(in_srgb,var(--theme-paper)_86%,transparent)] p-3 text-[var(--theme-ink)] shadow-[0_14px_30px_rgb(48_38_34_/_0.12)] backdrop-blur-[10px] transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:-rotate-3">
            <span className="block text-[0.48rem] font-extrabold tracking-[0.13em] text-[var(--theme-accent)] uppercase">
              Untuk
            </span>
            <strong className="mt-1 block font-serif text-sm leading-none font-medium">
              Aditya &amp; Keluarga
            </strong>
          </div>

          <div
            className={`absolute top-1/2 left-1/2 z-10 flex w-[42%] min-w-[8.2rem] -translate-x-1/2 -translate-y-1/2 -rotate-2 flex-col justify-center border border-[color-mix(in_srgb,var(--theme-accent)_18%,transparent)] bg-[var(--theme-paper)] px-4 text-[var(--theme-ink)] shadow-[0_20px_40px_rgb(49_38_34_/_0.2)] transition-transform duration-200 group-hover:-translate-y-[52%] group-hover:-rotate-1 ${
              theme.key === 'aruna' ? 'items-start text-left' : 'items-center text-center'
            }`}
            style={{ aspectRatio: '0.72' }}
          >
            <span className="text-[0.46rem] font-extrabold tracking-[0.18em] text-[var(--theme-accent)] uppercase">
              The wedding of
            </span>
            <strong className="mt-3 font-serif text-[clamp(1.7rem,3vw,2.45rem)] leading-[0.76] font-medium tracking-[-0.065em]">
              Kirana
            </strong>
            <em className="my-1 font-serif text-lg text-[var(--theme-accent)]">&amp;</em>
            <strong className="font-serif text-[clamp(1.7rem,3vw,2.45rem)] leading-[0.76] font-medium tracking-[-0.065em]">
              Arga
            </strong>
            <small className="mt-3 text-[0.42rem] font-bold tracking-[0.1em] uppercase">
              17.08.27 · Jakarta
            </small>
          </div>

          <div className="absolute right-0 bottom-[11%] z-20 w-[37%] rotate-4 rounded-[0.85rem] border border-[color-mix(in_srgb,var(--theme-accent)_22%,transparent)] bg-[color-mix(in_srgb,var(--theme-paper)_86%,transparent)] p-3 text-[var(--theme-ink)] shadow-[0_14px_30px_rgb(48_38_34_/_0.12)] backdrop-blur-[10px] transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:rotate-2">
            <span className="block text-[0.48rem] font-extrabold tracking-[0.13em] text-[var(--theme-accent)] uppercase">
              RSVP
            </span>
            <strong className="mt-1 block font-serif text-sm leading-none font-medium">
              Hadir · 2 tamu
            </strong>
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[0.62rem] font-extrabold tracking-[0.12em] text-[var(--theme-accent)] uppercase">
              {theme.personality}
            </p>
            <h3 className="text-seraya-text-primary mt-1 font-serif text-3xl leading-none font-medium tracking-[-0.045em]">
              {theme.name}
            </h3>
          </div>
          <span
            aria-live="polite"
            className="shrink-0 rounded-full bg-[color-mix(in_srgb,var(--theme-canvas)_64%,white)] px-3 py-1.5 text-[0.64rem] font-extrabold text-[var(--theme-accent)]"
          >
            {activePalette.name}
          </span>
        </div>

        <p className="text-seraya-text-secondary mt-3 min-h-[3.8rem] text-sm leading-6">
          {theme.description}
        </p>

        <fieldset className="mt-4">
          <legend className="sr-only">Pilihan warna {theme.name}</legend>
          <div className="flex items-center gap-3">
            {theme.palettes.map((palette) => (
              <label className="relative cursor-pointer" key={palette.key} title={palette.name}>
                <input
                  aria-label={`Gunakan warna ${palette.name} untuk ${theme.name}`}
                  className="peer sr-only"
                  data-palette-key={palette.key}
                  defaultChecked={palette.key === theme.palettes[0]?.key}
                  name={`${theme.key}-palette`}
                  onChange={() => setPaletteKey(palette.key)}
                  type="radio"
                  value={palette.key}
                />
                <span
                  aria-hidden="true"
                  className="block size-8 rounded-full border-[3px] border-[var(--seraya-bg-surface)] shadow-[0_0_0_1px_rgb(57_45_40_/_0.18)] transition-transform peer-checked:shadow-[0_0_0_2px_var(--seraya-bg-surface),0_0_0_4px_var(--theme-accent)] peer-focus-visible:outline-3 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-[var(--seraya-focus-ring)] hover:scale-110"
                  style={{ backgroundColor: palette.swatch }}
                />
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-5 grid grid-cols-[0.82fr_1.18fr] gap-3">
          <Link
            className="border-seraya-border-default text-seraya-text-primary inline-flex min-h-11 items-center justify-center rounded-full border text-sm font-extrabold transition-transform hover:-translate-y-px focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[var(--seraya-focus-ring)]"
            href={previewHref}
          >
            Preview
          </Link>
          <Link
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--theme-accent)] px-4 text-sm font-extrabold text-[var(--theme-paper)] transition-transform hover:-translate-y-px focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[var(--seraya-focus-ring)]"
            href={selectHref}
          >
            Pilih tema <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
