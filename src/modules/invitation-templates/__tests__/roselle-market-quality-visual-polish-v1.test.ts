import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const roselleTemplate = readFileSync(
  join(process.cwd(), 'src/modules/invitation-templates/roselle/roselle-template.tsx'),
  'utf8',
);
const roselleSections = readFileSync(
  join(process.cwd(), 'src/modules/invitation-templates/roselle/roselle-sections.tsx'),
  'utf8',
);
const polishStyles = readFileSync(
  join(
    process.cwd(),
    'src/modules/invitation-templates/roselle/roselle-market-polish-v1.module.css',
  ),
  'utf8',
);
const correctionStyles = readFileSync(
  join(
    process.cwd(),
    'src/modules/invitation-templates/roselle/roselle-market-corrections-v1.module.css',
  ),
  'utf8',
);
const galleryImage = readFileSync(
  join(process.cwd(), 'src/modules/invitation-templates/invitation-gallery-image.tsx'),
  'utf8',
);
const audioStyles = readFileSync(
  join(process.cwd(), 'src/components/invitation-audio-playback-control.module.css'),
  'utf8',
);

describe('J1.2 Roselle market-quality visual polish contract', () => {
  it('adds the market polish and focused correction layers without replacing the locked J1.1 gate', () => {
    expect(roselleTemplate).toContain(
      "import marketPolishStyles from './roselle-market-polish-v1.module.css'",
    );
    expect(roselleTemplate).toContain(
      "import marketCorrectionStyles from './roselle-market-corrections-v1.module.css'",
    );
    expect(roselleTemplate).toContain('${marketPolishStyles.marketPolish}');
    expect(roselleTemplate).toContain('${marketCorrectionStyles.marketCorrections}');
    expect(roselleTemplate).toContain('data-roselle-market-floor="v1"');
    expect(roselleTemplate).toContain('data-roselle-market-polish="v1"');
    expect(roselleTemplate).toContain('data-roselle-market-corrections="v1"');
    expect(roselleTemplate).toContain('data-roselle-opening-gate="market-floor-v1"');
  });

  it('preserves gallery media as the fallback opening and story art direction', () => {
    expect(roselleTemplate).toContain('featuredCover ?? invitation.gallery?.images[0] ?? null');
    expect(roselleTemplate).toContain(
      'invitation.premiumMedia?.storyImage ?? invitation.gallery?.images[1] ?? null',
    );
    expect(roselleTemplate).toContain("openingImage ? 'gallery-first' : null");
    expect(roselleTemplate).toContain('openingImage={openingImage}');
    expect(roselleTemplate).toContain('storyImage={storyImage}');
    expect(roselleSections).toContain("openingMediaSource ?? 'gallery-first'");
    expect(roselleSections).toContain('data-roselle-opening-portrait');
    expect(roselleSections).toContain('data-roselle-story-media');
    expect(roselleSections).toContain('fetchPriority="high"');
    expect(roselleSections).toContain('loading="eager"');
  });

  it('keeps shared gallery loading lazy by default while allowing Roselle LCP priority', () => {
    expect(galleryImage).toContain("fetchPriority?: 'auto' | 'high' | 'low'");
    expect(galleryImage).toContain("loading?: 'eager' | 'lazy'");
    expect(galleryImage).toContain("fetchPriority = 'low'");
    expect(galleryImage).toContain("loading = 'lazy'");
    expect(galleryImage).toContain('fetchPriority={fetchPriority}');
    expect(galleryImage).toContain('loading={loading}');
  });

  it('removes duplicate event chrome only when the native utility is present', () => {
    expect(polishStyles).toContain(':has(:global([data-template-event-action-list]))');
    expect(polishStyles).toContain("[data-schedule-event='roselle']");
    expect(polishStyles).toContain("a[target='_blank']");
    expect(polishStyles).toContain('display: none');
  });

  it('creates photo-led peaks and quieter guest-response chrome', () => {
    expect(polishStyles).toContain("[data-roselle-chapter='gallery']");
    expect(polishStyles).toContain('linear-gradient(160deg, #3d2933, #2f2229 72%)');
    expect(polishStyles).toContain('[data-roselle-response-step]');
    expect(polishStyles).toContain("[data-roselle-farewell='market-floor-v1']");
    expect(audioStyles).toContain('background: rgb(53 37 46 / 0.9)');
  });

  it('corrects long-gallery continuity, mobile story rhythm, and touch target floors', () => {
    expect(correctionStyles).toContain('figure:nth-child(n + 7)');
    expect(correctionStyles).toContain('figure:nth-child(3n + 9)');
    expect(correctionStyles).toContain("[data-roselle-story-media]");
    expect(correctionStyles).toContain('order: 1');
    expect(correctionStyles).toContain("[data-roselle-story-letter]");
    expect(correctionStyles).toContain('order: 2');
    expect(correctionStyles).toContain('min-height: 2.75rem');
    expect(audioStyles.match(/min-height: 2\.75rem/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('keeps the opening usable on primary and short-height mobile guest viewports', () => {
    expect(correctionStyles).toContain('@media (max-width: 26.875rem)');
    expect(correctionStyles).toContain('(max-height: 46.25rem)');
    expect(correctionStyles).toContain('min-height: 62svh');
    expect(correctionStyles).toContain('@media (max-width: 22.5rem)');
    expect(correctionStyles).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('locks the base polish to the 430, 390, and 360 mobile quality gates', () => {
    expect(polishStyles).toContain('@media (max-width: 26.875rem)');
    expect(polishStyles).toContain('@media (max-width: 24.375rem)');
    expect(polishStyles).toContain('@media (max-width: 22.5rem)');
    expect(polishStyles).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('allows J1.3 canonical media without weakening the J1.2 CSS safety boundary', () => {
    expect(roselleTemplate).toContain("invitation.premiumMedia?.coverImage");
    expect(roselleSections).toContain('data-roselle-wedding-film');
    expect(polishStyles).not.toMatch(/url\(['"]?https?:\/\//);
    expect(correctionStyles).not.toMatch(/url\(['"]?https?:\/\//);
  });
});
