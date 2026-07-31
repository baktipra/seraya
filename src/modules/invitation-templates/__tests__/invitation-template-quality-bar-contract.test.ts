import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const rootLayout = readFileSync(join(process.cwd(), 'src/app/layout.tsx'), 'utf8');
const fixtureLayout = readFileSync(
  join(process.cwd(), 'tests/e2e/fixture-app/app/layout.tsx'),
  'utf8',
);
const qualityBarStyles = readFileSync(
  join(process.cwd(), 'src/app/invitation-template-quality-bar.css'),
  'utf8',
);

describe('P0-B3 invitation template quality bar contract', () => {
  it('loads the template quality layer after shared layout recovery in production and fixtures', () => {
    const recoveryImport = "import './invitation-layout-recovery.css';";
    const qualityImport = "import './invitation-template-quality-bar.css';";
    const fixtureRecoveryImport = "import '../../../../src/app/invitation-layout-recovery.css';";
    const fixtureQualityImport =
      "import '../../../../src/app/invitation-template-quality-bar.css';";

    expect(rootLayout.indexOf(qualityImport)).toBeGreaterThan(rootLayout.indexOf(recoveryImport));
    expect(fixtureLayout.indexOf(fixtureQualityImport)).toBeGreaterThan(
      fixtureLayout.indexOf(fixtureRecoveryImport),
    );
  });

  it('matures Roselle as the romantic editorial flagship', () => {
    expect(qualityBarStyles).toContain("article[data-template='roselle']");
    expect(qualityBarStyles).toContain("[data-roselle-chapter='couple']");
    expect(qualityBarStyles).toContain("[data-roselle-chapter='gallery']");
    expect(qualityBarStyles).toContain("[data-template-response-journey='roselle']");
    expect(qualityBarStyles).toContain('var(--roselle-wash)');
  });

  it('matures Aruna with directional modern editorial structure', () => {
    expect(qualityBarStyles).toContain("article[data-template='aruna']");
    expect(qualityBarStyles).toContain("[data-invitation-chapter='opening']::after");
    expect(qualityBarStyles).toContain("[data-schedule-event='aruna']");
    expect(qualityBarStyles).toContain("[data-template-response-introduction='aruna']");
    expect(qualityBarStyles).toContain('var(--aruna-clay)');
  });

  it('matures Laras with restrained original heritage geometry and tonal chapter fields', () => {
    expect(qualityBarStyles).toContain('--seraya-laras-heritage-field');
    expect(qualityBarStyles).toContain("article[data-template='laras']");
    expect(qualityBarStyles).toContain('[data-invitation-gallery] figure');
    expect(qualityBarStyles).toContain("[data-template-response-journey='laras']");
    expect(qualityBarStyles).toContain('rgb(200 161 110 / 0.055)');
  });

  it('keeps the layer asset-free, presentation-only, and motion-safe', () => {
    expect(qualityBarStyles).not.toMatch(/url\(['"]?https?:\/\//);
    expect(qualityBarStyles).not.toContain('@keyframes');
    expect(qualityBarStyles).toContain('@media (prefers-reduced-motion: reduce)');
    expect(qualityBarStyles).not.toContain('display: none');
  });

  it('retains narrow-mobile repair coverage for all three identities', () => {
    expect(qualityBarStyles).toContain('@media (max-width: 36rem)');
    expect(qualityBarStyles).toContain(
      "article[data-template='roselle'] [data-invitation-schedule-journey]::before",
    );
    expect(qualityBarStyles).toContain(
      "article[data-template='aruna'] [data-invitation-chapter='opening']::after",
    );
    expect(qualityBarStyles).toContain(
      "article[data-template='laras'] [data-invitation-gallery] figure",
    );
  });
});
