import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const rootLayout = readFileSync(join(process.cwd(), 'src/app/layout.tsx'), 'utf8');
const maturationStyles = readFileSync(
  join(process.cwd(), 'src/app/aruna-flagship-maturation-release.css'),
  'utf8',
);
const arunaTemplate = readFileSync(
  join(process.cwd(), 'src/modules/invitation-templates/aruna/aruna-template.tsx'),
  'utf8',
);

describe('SERAYA Aruna Flagship Guest Experience Maturation V1', () => {
  it('loads the Aruna flagship layer after the shared quality bar', () => {
    const qualityBar = rootLayout.indexOf("import './invitation-template-quality-bar.css';");
    const arunaLayer = rootLayout.indexOf("import './aruna-flagship-maturation-release.css';");

    expect(qualityBar).toBeGreaterThan(-1);
    expect(arunaLayer).toBeGreaterThan(qualityBar);
  });

  it('preserves the canonical personal-versus-generic opening handoff', () => {
    expect(arunaTemplate).toContain('personalSlots?.greeting');
    expect(arunaTemplate).toContain("'aruna-personal-greeting'");
    expect(arunaTemplate).toContain("'aruna-couple-title'");
    expect(arunaTemplate).toContain('data-aruna-opening-action');
    expect(arunaTemplate).toContain('Buka undangan');
  });

  it('keeps the addressed greeting, journal chapters, and return action template-owned', () => {
    expect(arunaTemplate).toContain('data-aruna-editors-note');
    expect(arunaTemplate).toContain('aria-label="Sapaan untuk tamu"');
    expect(arunaTemplate).toContain('data-aruna-couple-feature');
    expect(arunaTemplate).toContain('data-aruna-feature-story');
    expect(arunaTemplate).toContain('data-aruna-colophon');
    expect(arunaTemplate).toContain('data-aruna-return-action');
    expect(arunaTemplate).toContain('href="#aruna-invitation-title"');
  });

  it('matures the schedule and gallery as an agenda and photo essay without changing their data contract', () => {
    expect(arunaTemplate).toContain('data-aruna-agenda-entry');
    expect(arunaTemplate).toContain('data-invitation-schedule-journey="aruna"');
    expect(arunaTemplate).toContain('data-aruna-photo-essay');
    expect(arunaTemplate).toContain('data-invitation-gallery');
    expect(maturationStyles).toContain('[data-aruna-agenda-page]');
    expect(maturationStyles).toContain('[data-aruna-photo-frame]');
    expect(maturationStyles).toContain('grid-template-columns: repeat(12, minmax(0, 1fr));');
  });

  it('keeps RSVP and Guestbook behavior shared while composing them as one editorial reply desk', () => {
    expect(arunaTemplate).toContain('data-template-response-journey="aruna"');
    expect(arunaTemplate).toContain('data-aruna-response-column="rsvp"');
    expect(arunaTemplate).toContain('data-aruna-response-column="guestbook"');
    expect(arunaTemplate).toContain('data-template-response-slot="rsvp"');
    expect(arunaTemplate).toContain('data-template-response-slot="guestbook"');
    expect(maturationStyles).toContain('counter-reset: aruna-response-step;');
    expect(maturationStyles).toContain("content: '0' counter(aruna-response-step) ' / RESPONS';");
  });

  it('preserves the generic response boundary', () => {
    expect(arunaTemplate).toContain("renderContext.surface !== 'personal'");
    expect(arunaTemplate).toContain('data-generic-response-note="aruna"');
    expect(arunaTemplate).not.toContain('guestToken');
    expect(arunaTemplate).not.toContain('whatsapp');
  });

  it('hardens touch, focus, narrow mobile, and reduced-motion behavior', () => {
    expect(maturationStyles).toContain('min-height: 3.25rem');
    expect(maturationStyles).toContain('outline: 3px solid currentColor;');
    expect(maturationStyles).toContain('@media (max-width: 48rem)');
    expect(maturationStyles).toContain('@media (max-width: 31rem)');
    expect(maturationStyles).toContain('@media (prefers-reduced-motion: reduce)');
    expect(maturationStyles).toContain('transition-duration: 0.01ms !important;');
  });
});
