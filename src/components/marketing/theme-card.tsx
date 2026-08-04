'use client';

import type { CSSProperties } from 'react';
import type { Route } from 'next';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { CanonicalInvitationThumbnail } from './canonical-invitation-thumbnail';
import type { ThemeCatalogItem } from './theme-catalog';

type ThemeCardStyle = CSSProperties & Record<`--theme-${string}`, string>;

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
  const previewHref = `/templates/${theme.key}/demo/generic?palette=${activePalette.key}` as Route;
  const selectHref = `/dashboard/new?template=${theme.key}&palette=${activePalette.key}` as Route;

  return (
    <article
      className="group border-seraya-border-default bg-seraya-surface min-w-0 overflow-hidden rounded-[1.5rem] border shadow-[0_18px_46px_rgb(55_43_39_/_0.08)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:border-[var(--theme-accent)] hover:shadow-[0_26px_58px_rgb(55_43_39_/_0.13)]"
      data-active-palette={activePalette.key}
      data-homepage-theme-card={theme.key}
      data-theme-key={theme.key}
      style={themeStyle}
    >
      <CanonicalInvitationThumbnail
        className="aspect-[1.18] w-full transition-colors duration-300"
        paletteCanvas={activePalette.canvas}
        paletteKey={activePalette.key}
        paletteName={activePalette.name}
        templateKey={theme.key}
        variant="card"
      />

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
