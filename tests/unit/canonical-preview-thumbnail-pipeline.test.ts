import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { invitationThemePackages } from '../../src/modules/invitation-templates/core/theme-package.registry';

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('canonical static thumbnail capture pipeline V4G', () => {
  it('exposes twelve package-owned theme and palette combinations', () => {
    expect(invitationThemePackages).toHaveLength(3);
    expect(invitationThemePackages.flatMap((themePackage) => themePackage.palettes)).toHaveLength(
      12,
    );
    expect(invitationThemePackages.every((themePackage) => themePackage.palettes.length === 4)).toBe(
      true,
    );
  });

  it('renders catalog thumbnails from optimized static assets instead of iframe renderers', () => {
    const thumbnail = readSource(
      'src/components/marketing/canonical-invitation-thumbnail.tsx',
    );

    expect(thumbnail).toContain('data-canonical-thumbnail-source="static-canonical-capture"');
    expect(thumbnail).toContain('<picture aria-hidden="true">');
    expect(thumbnail).toContain("extension: 'svg' | 'webp'");
    expect(thumbnail).toContain('/invitation-thumbnails/${STATIC_THUMBNAIL_VERSION}/');
    expect(thumbnail).not.toContain('<iframe');
  });

  it('keeps homepage palette interaction connected to the static canonical thumbnail component', () => {
    const themeCard = readSource('src/components/marketing/theme-card.tsx');

    expect(themeCard).toContain('<CanonicalInvitationThumbnail');
    expect(themeCard).toContain('paletteKey={activePalette.key}');
    expect(themeCard).not.toContain('Aditya &amp; Keluarga');
    expect(themeCard).not.toContain('Hadir · 2 tamu');
  });

  it('preserves the headerless canonical renderer surface as the capture source of truth', () => {
    const showroom = readSource('src/app/templates/[templateKey]/demo/[surface]/page.tsx');

    expect(showroom).toContain("getQueryValue(query?.embed) === 'thumbnail'");
    expect(showroom).toContain("data-showroom-embed={embedMode ? 'thumbnail' : undefined}");
    expect(showroom).toContain('embedMode ? null : (');
    expect(showroom).toContain('<InvitationTemplateRenderer');
    expect(showroom).toContain('paletteKey={paletteKey}');
  });

  it('ships a complete static fallback matrix and promotes WebP captures atomically', () => {
    const manifest = JSON.parse(
      readSource('public/invitation-thumbnails/v4g/manifest.json'),
    ) as {
      entries: Array<{ fallback: string; paletteKey: string; templateKey: string; webp: string }>;
      version: string;
    };

    expect(manifest.version).toBe('v4g');
    expect(manifest.entries).toHaveLength(12);
    for (const entry of manifest.entries) {
      expect(
        existsSync(resolve(process.cwd(), entry.fallback.replace(/^\//, 'public/'))),
      ).toBe(true);
    }

    const captureStatus = readSource(
      'src/components/marketing/canonical-thumbnail-capture-status.ts',
    );
    expect(captureStatus).toContain('CANONICAL_THUMBNAIL_WEBP_READY');
  });

  it('can recapture, optimize, verify, and commit thumbnails from the canonical showroom', () => {
    const captureScript = readSource('scripts/capture-canonical-thumbnails.mjs');
    const workflow = readSource('.github/workflows/capture-canonical-thumbnails.yml');

    expect(captureScript).toContain("roselle: ['rose', 'sage', 'butter', 'berry']");
    expect(captureScript).toContain("aruna: ['stone', 'matcha', 'cobalt', 'apricot']");
    expect(captureScript).toContain("laras: ['midnight', 'burgundy', 'emerald', 'ivory']");
    expect(captureScript).toContain("source: 'canonical-showroom-renderer'");
    expect(workflow).toContain('npx playwright install --with-deps chromium');
    expect(workflow).toContain('cwebp -quiet -q 86 -m 6');
    expect(workflow).toContain('CANONICAL_THUMBNAIL_WEBP_READY = true as const');
    expect(workflow).toContain("test \"$(find public/invitation-thumbnails/v4g -maxdepth 1 -name '*.webp' | wc -l)\" -eq 12");
  });
});
