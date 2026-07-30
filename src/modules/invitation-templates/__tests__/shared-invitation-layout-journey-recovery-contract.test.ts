import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const rootLayout = readFileSync(join(process.cwd(), 'src/app/layout.tsx'), 'utf8');
const recoveryStyles = readFileSync(
  join(process.cwd(), 'src/app/invitation-layout-recovery.css'),
  'utf8',
);
const roselleTemplate = readFileSync(
  join(process.cwd(), 'src/modules/invitation-templates/roselle/roselle-template.tsx'),
  'utf8',
);
const arunaTemplate = readFileSync(
  join(process.cwd(), 'src/modules/invitation-templates/aruna/aruna-template.tsx'),
  'utf8',
);
const larasTemplate = readFileSync(
  join(process.cwd(), 'src/modules/invitation-templates/laras/laras-template.tsx'),
  'utf8',
);
const fixtureInvitation = readFileSync(
  join(process.cwd(), 'tests/e2e/fixture-app/lib/fixture-invitation.ts'),
  'utf8',
);

const templateSources = [roselleTemplate, arunaTemplate, larasTemplate];

describe('P0-B1/B2 shared invitation layout and journey recovery contract', () => {
  it('loads the recovery layer after every existing invitation release layer', () => {
    const roselleLayer = rootLayout.indexOf("import './roselle-flagship-maturation-release.css';");
    const recoveryLayer = rootLayout.indexOf("import './invitation-layout-recovery.css';");

    expect(roselleLayer).toBeGreaterThan(-1);
    expect(recoveryLayer).toBeGreaterThan(roselleLayer);
  });

  it('gives every template the same opening, schedule, surface, and return hooks', () => {
    for (const templateSource of templateSources) {
      expect(templateSource).toContain('data-surface={renderContext.surface}');
      expect(templateSource).toContain('data-invitation-opening-action');
      expect(templateSource).toContain('data-invitation-schedule-journey');
      expect(templateSource).toContain('data-invitation-return-action');
      expect(templateSource).toContain('Buka undangan');
      expect(templateSource).toContain('Kembali ke awal');
    }
  });

  it('keeps addressed greetings as dedicated post-opening regions', () => {
    expect(arunaTemplate).toContain('id="aruna-personal-greeting"');
    expect(larasTemplate).toContain('id="laras-personal-greeting"');
    expect(arunaTemplate.indexOf('</header>')).toBeLessThan(
      arunaTemplate.indexOf('id="aruna-personal-greeting"'),
    );
    expect(larasTemplate.indexOf('</header>')).toBeLessThan(
      larasTemplate.indexOf('id="laras-personal-greeting"'),
    );
  });

  it('defines canonical readable, form, media, spacing, and control geometry', () => {
    expect(recoveryStyles).toContain('--seraya-invitation-readable-measure: 38rem');
    expect(recoveryStyles).toContain('--seraya-invitation-form-measure: 40rem');
    expect(recoveryStyles).toContain('--seraya-invitation-media-measure: 48rem');
    expect(recoveryStyles).toContain('--seraya-invitation-chapter-space');
    expect(recoveryStyles).toContain('min-height: 3rem');
    expect(recoveryStyles).toContain('[data-invitation-schedule-journey]');
  });

  it('repairs the Laras narrow-mobile gallery without flattening desktop identity', () => {
    expect(recoveryStyles).toContain("article[data-template='laras'] [data-invitation-gallery] > div");
    expect(recoveryStyles).toContain('grid-template-columns: 1fr');
    expect(recoveryStyles).toContain('aspect-ratio: 4 / 5');
    expect(recoveryStyles).toContain('aspect-ratio: 4 / 3');
  });

  it('uses a complete deterministic stress fixture for the visual matrix', () => {
    expect(fixtureInvitation.match(/createFixtureImage\(/g)).toHaveLength(7);
    expect(fixtureInvitation).toContain('Raka Adiprana Wiratama');
    expect(fixtureInvitation).toContain('Nadia Kirana Maharani');
    expect(fixtureInvitation).toContain('Resepsi dan Jamuan Malam');
    expect(fixtureInvitation).toContain('Jakarta Convention Center — Assembly Hall');
    expect(fixtureInvitation.match(/providerName:/g)).toHaveLength(2);
  });
});
