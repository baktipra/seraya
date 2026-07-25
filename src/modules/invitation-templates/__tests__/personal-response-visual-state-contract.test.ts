import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const releaseStyles = readFileSync(
  join(process.cwd(), 'src/app/personal-response-release.css'),
  'utf8',
);
const rootLayout = readFileSync(join(process.cwd(), 'src/app/layout.tsx'), 'utf8');

const templateKeys = ['roselle', 'aruna', 'laras'] as const;

describe('J1R-D personal response visual state contract', () => {
  it('loads the scoped release layer after the existing accessibility styles', () => {
    const accessibilityImport = rootLayout.indexOf("import './accessibility-release.css';");
    const responseImport = rootLayout.indexOf("import './personal-response-release.css';");

    expect(accessibilityImport).toBeGreaterThan(-1);
    expect(responseImport).toBeGreaterThan(accessibilityImport);
  });

  it.each(templateKeys)('moves visible keyboard focus to the %s RSVP choice surface', (key) => {
    expect(releaseStyles).toContain(`[data-template='${key}'][data-surface='personal']`);
    expect(releaseStyles).toContain('[data-personal-rsvp-choice]:focus-within');
    expect(releaseStyles).toContain('[data-personal-rsvp-choice]:has(input:focus-visible)');
  });

  it.each(templateKeys)('gives %s a truthful disabled submit state', (key) => {
    const scopedStart = releaseStyles.indexOf(
      `[data-template='${key}'][data-surface='personal']`,
    );
    const disabledState = releaseStyles.indexOf('[data-personal-response-submit]:disabled', scopedStart);

    expect(scopedStart).toBeGreaterThan(-1);
    expect(disabledState).toBeGreaterThan(scopedStart);
    expect(releaseStyles.slice(disabledState, disabledState + 500)).toContain('cursor: not-allowed');
  });

  it('separates Aruna and Laras chapter headings from capability headings', () => {
    expect(releaseStyles).toContain("[data-template-response-introduction='aruna']");
    expect(releaseStyles).toContain("[data-template-response-introduction='laras']");
    expect(releaseStyles).toContain('[data-template-response-slot]');
    expect(releaseStyles).toContain('font-size: clamp(2.65rem, 8vw, 4.2rem)');
    expect(releaseStyles).toContain('font-size: clamp(2.5rem, 7.6vw, 3.9rem)');
  });

  it('makes the required Aruna RSVP choice visibly control-like', () => {
    expect(releaseStyles).toContain('[data-personal-rsvp-choice]::before');
    expect(releaseStyles).toContain("[data-personal-rsvp-choice][data-selected='true']::before");
    expect(releaseStyles).toContain('border-radius: 0.35rem');
  });

  it('keeps the Laras introduction formal while making response forms scannable', () => {
    expect(releaseStyles).toContain("[data-template-response-introduction='laras']");
    expect(releaseStyles).toContain('[data-personal-guest-rsvp]');
    expect(releaseStyles).toContain('[data-personal-guestbook]');
    expect(releaseStyles).toContain('text-align: left');
    expect(releaseStyles).toContain('@media (max-width: 36rem)');
  });

  it('removes decorative transitions for reduced-motion users', () => {
    expect(releaseStyles).toContain('@media (prefers-reduced-motion: reduce)');
    expect(releaseStyles).toContain('transition: none');
  });
});
