import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const galleryComponent = readFileSync(
  join(process.cwd(), 'src/modules/invitation-templates/invitation-gallery-image.tsx'),
  'utf8',
);
const mediaStyles = readFileSync(
  join(process.cwd(), 'src/app/invitation-media-release.css'),
  'utf8',
);
const rootLayout = readFileSync(join(process.cwd(), 'src/app/layout.tsx'), 'utf8');
const fixtureLayout = readFileSync(
  join(process.cwd(), 'tests/e2e/fixture-app/app/layout.tsx'),
  'utf8',
);

const templateSources = [
  'src/modules/invitation-templates/roselle/roselle-sections.tsx',
  'src/modules/invitation-templates/aruna/aruna-template.tsx',
  'src/modules/invitation-templates/laras/laras-template.tsx',
].map((path) => readFileSync(join(process.cwd(), path), 'utf8'));

describe('Release A invitation media delivery contract', () => {
  it('loads the media layer after invitation composition and opening layers', () => {
    const compositionLayer = rootLayout.indexOf("import './invitation-maturation-release.css';");
    const openingLayer = rootLayout.indexOf(
      "import './invitation-opening-maturation-release.css';",
    );
    const mediaLayer = rootLayout.indexOf("import './invitation-media-release.css';");

    expect(compositionLayer).toBeGreaterThan(-1);
    expect(openingLayer).toBeGreaterThan(compositionLayer);
    expect(mediaLayer).toBeGreaterThan(openingLayer);
    expect(fixtureLayout).toContain("import '../../../../src/app/invitation-media-release.css';");
  });

  it('uses one lazy, async, low-priority image contract with intrinsic dimensions', () => {
    expect(galleryComponent).toContain('decoding="async"');
    expect(galleryComponent).toContain('fetchPriority="low"');
    expect(galleryComponent).toContain('loading="lazy"');
    expect(galleryComponent).toContain('height={1125}');
    expect(galleryComponent).toContain('width={900}');
    expect(galleryComponent).toContain('sizes={sizes}');
  });

  it('owns explicit loading, ready, and failed media states without changing figure geometry', () => {
    expect(galleryComponent).toContain(
      "type InvitationMediaState = 'loading' | 'ready' | 'failed';",
    );
    expect(galleryComponent).toContain("setMediaState('ready')");
    expect(galleryComponent).toContain("setMediaState('failed')");
    expect(galleryComponent).toContain('Foto belum dapat ditampilkan');
    expect(mediaStyles).toContain('[data-invitation-media-frame]');
    expect(mediaStyles).toContain("[data-media-state='failed']");
    expect(mediaStyles).toContain('height: 100%');
    expect(mediaStyles).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it.each(templateSources)(
    'routes each collection gallery through the shared component',
    (source) => {
      expect(source).toContain(
        "import { InvitationGalleryImage } from '../invitation-gallery-image';",
      );
      expect(source).toContain('<InvitationGalleryImage');
      expect(source).toContain('data-invitation-gallery');
      expect(source).not.toMatch(/<img\s/);
    },
  );
});
