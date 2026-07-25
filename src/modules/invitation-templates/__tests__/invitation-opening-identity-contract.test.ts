import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { createLarasMonogram } from '../laras/laras-monogram';

const openingStyles = readFileSync(
  join(process.cwd(), 'src/app/invitation-opening-maturation-release.css'),
  'utf8',
);
const rootLayout = readFileSync(join(process.cwd(), 'src/app/layout.tsx'), 'utf8');
const larasTemplate = readFileSync(
  join(process.cwd(), 'src/modules/invitation-templates/laras/laras-template.tsx'),
  'utf8',
);

describe('Release A invitation opening identity contract', () => {
  it('loads the opening maturation layer after the complete invitation layer', () => {
    const invitationLayer = rootLayout.indexOf("import './invitation-maturation-release.css';");
    const openingLayer = rootLayout.indexOf(
      "import './invitation-opening-maturation-release.css';",
    );

    expect(invitationLayer).toBeGreaterThan(-1);
    expect(openingLayer).toBeGreaterThan(invitationLayer);
  });

  it.each(['roselle', 'aruna', 'laras'] as const)(
    'owns a distinct %s flagship opening selector',
    (templateKey) => {
      expect(openingStyles).toContain(`article[data-template='${templateKey}']`);
    },
  );

  it('keeps mobile first screens immersive and reduced-motion safe', () => {
    expect(openingStyles).toContain('@media (max-width: 36rem)');
    expect(openingStyles).toContain('min-height: 88svh');
    expect(openingStyles).toContain('@media (prefers-reduced-motion: reduce)');
    expect(openingStyles).toContain('animation: none !important');
  });

  it('derives the Laras monogram from both couple display names', () => {
    expect(createLarasMonogram('Raka', 'Nadia')).toBe('RN');
    expect(createLarasMonogram('  mira', 'arga ')).toBe('MA');
    expect(createLarasMonogram('', '')).toBe('L');
  });

  it('renders the derived Laras monogram instead of a hardcoded template letter', () => {
    expect(larasTemplate).toContain('createLarasMonogram(');
    expect(larasTemplate).toContain('data-opening-monogram');
    expect(larasTemplate).toContain('{monogram}');
    expect(larasTemplate).not.toMatch(/>\s*L\s*</);
  });
});
