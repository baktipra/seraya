import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const rootLayout = readFileSync(join(process.cwd(), 'src/app/layout.tsx'), 'utf8');
const maturationStyles = readFileSync(
  join(process.cwd(), 'src/app/roselle-flagship-maturation-release.css'),
  'utf8',
);
const roselleTemplate = readFileSync(
  join(process.cwd(), 'src/modules/invitation-templates/roselle/roselle-template.tsx'),
  'utf8',
);

describe('J3 Roselle flagship guest experience contract', () => {
  it('loads the Roselle maturation layer after the shared invitation release layers', () => {
    const mediaLayer = rootLayout.indexOf("import './invitation-media-release.css';");
    const roselleLayer = rootLayout.indexOf("import './roselle-flagship-maturation-release.css';");

    expect(mediaLayer).toBeGreaterThan(-1);
    expect(roselleLayer).toBeGreaterThan(mediaLayer);
  });

  it('routes the opening action to the addressed greeting on personal invitations', () => {
    expect(roselleTemplate).toContain('personalSlots?.greeting');
    expect(roselleTemplate).toContain("'roselle-personal-greeting'");
    expect(roselleTemplate).toContain("'roselle-couple-title'");
    expect(roselleTemplate).toContain('data-roselle-opening-action');
    expect(roselleTemplate).toContain('Buka undangan');
  });

  it('keeps the personal greeting identifiable as an addressed letter region', () => {
    expect(roselleTemplate).toContain('aria-label="Sapaan untuk tamu"');
    expect(roselleTemplate).toContain('data-roselle-addressed-letter');
    expect(roselleTemplate).toContain('id="roselle-personal-greeting"');
    expect(roselleTemplate).toContain('role="region"');
  });

  it('numbers only the response steps that are actually available', () => {
    expect(roselleTemplate).toContain('responseStepCount');
    expect(roselleTemplate).toContain('rsvpStepNumber');
    expect(roselleTemplate).toContain('guestbookStepNumber');
    expect(roselleTemplate.match(/data-roselle-response-step/g)).toHaveLength(2);
  });

  it('closes the journey with a keyboard-accessible return to the opening', () => {
    expect(roselleTemplate).toContain('data-roselle-return-to-opening');
    expect(roselleTemplate).toContain('href="#roselle-invitation-title"');
    expect(roselleTemplate).toContain('Kembali ke awal');
    expect(maturationStyles).toContain('[data-roselle-return-to-opening]:focus-visible');
  });

  it('preserves touch target, mobile, focus, and reduced-motion contracts', () => {
    expect(maturationStyles).toContain('min-height: 3rem');
    expect(maturationStyles).toContain('@media (max-width: 31rem)');
    expect(maturationStyles).toContain('@media (prefers-reduced-motion: reduce)');
    expect(maturationStyles).toContain('outline: 3px solid');
  });
});
