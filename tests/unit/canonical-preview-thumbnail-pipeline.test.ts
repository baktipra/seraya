import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { invitationThemePackages } from '../../src/modules/invitation-templates/core/theme-package.registry';

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('canonical preview and thumbnail pipeline V4E', () => {
  it('exposes twelve package-owned theme and palette combinations', () => {
    expect(invitationThemePackages).toHaveLength(3);
    expect(invitationThemePackages.flatMap((themePackage) => themePackage.palettes)).toHaveLength(
      12,
    );
    expect(invitationThemePackages.every((themePackage) => themePackage.palettes.length === 4)).toBe(
      true,
    );
  });

  it('builds thumbnails from the canonical showroom renderer route', () => {
    const thumbnail = readSource(
      'src/components/marketing/canonical-invitation-thumbnail.tsx',
    );

    expect(thumbnail).toContain('data-canonical-thumbnail-source="showroom-renderer"');
    expect(thumbnail).toContain('/demo/generic?palette=');
    expect(thumbnail).toContain('&embed=thumbnail');
    expect(thumbnail).toContain('paletteCanvas: string');
    expect(thumbnail).toContain('paletteName: string');
  });

  it('replaces the homepage marketing mock with the canonical thumbnail component', () => {
    const themeCard = readSource('src/components/marketing/theme-card.tsx');

    expect(themeCard).toContain('<CanonicalInvitationThumbnail');
    expect(themeCard).toContain('paletteKey={activePalette.key}');
    expect(themeCard).not.toContain('Aditya &amp; Keluarga');
    expect(themeCard).not.toContain('Hadir · 2 tamu');
  });

  it('supports a headerless and non-interactive thumbnail surface without forking the renderer', () => {
    const showroom = readSource('src/app/templates/[templateKey]/demo/[surface]/page.tsx');

    expect(showroom).toContain("getQueryValue(query?.embed) === 'thumbnail'");
    expect(showroom).toContain("data-showroom-embed={embedMode ? 'thumbnail' : undefined}");
    expect(showroom).toContain('embedMode ? null : (');
    expect(showroom).toContain('<InvitationTemplateRenderer');
    expect(showroom).toContain('paletteKey={paletteKey}');
  });
});
