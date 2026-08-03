import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const larasTemplate = readFileSync(
  join(process.cwd(), 'src/modules/invitation-templates/laras/laras-template.tsx'),
  'utf8',
);
const experienceStyles = readFileSync(
  join(
    process.cwd(),
    'src/modules/invitation-templates/laras/laras-guest-experience.module.css',
  ),
  'utf8',
);

describe('Slice G3 Laras guest experience contract', () => {
  it('activates one template-owned formal evening presentation authority', () => {
    expect(larasTemplate).toContain(
      "import experienceStyles from './laras-guest-experience.module.css'",
    );
    expect(larasTemplate).toContain('experienceStyles.experience');
    expect(larasTemplate).toContain('data-laras-experience="evening-folio-v1"');
    expect(experienceStyles).toContain(
      ".experience[data-laras-experience='evening-folio-v1']",
    );
  });

  it('keeps generic and personal response authority unchanged', () => {
    expect(larasTemplate).toContain("renderContext.surface !== 'personal'");
    expect(larasTemplate).toContain('getPersonalInvitationPresentationSlots(renderContext)');
    expect(larasTemplate).toContain('data-generic-response-note="laras"');
    expect(larasTemplate).toContain('data-template-response-slot="rsvp"');
    expect(larasTemplate).toContain('data-template-response-slot="guestbook"');
  });

  it('composes the reserved personal place card before the couple presentation', () => {
    const openingAction = larasTemplate.indexOf('data-laras-opening-action');
    const greeting = larasTemplate.indexOf('data-laras-place-card');
    const couple = larasTemplate.indexOf('data-laras-couple-presentation');

    expect(openingAction).toBeGreaterThan(-1);
    expect(greeting).toBeGreaterThan(openingAction);
    expect(couple).toBeGreaterThan(greeting);
  });

  it('defines stable hooks for the full formal evening journey', () => {
    for (const hook of [
      'data-laras-evening-cover',
      'data-laras-crest',
      'data-laras-couple-grid',
      'data-laras-toast-note',
      'data-laras-evening-program',
      'data-laras-venue-card',
      'data-laras-salon-gallery',
      'data-laras-gift-ledger',
      'data-laras-response-ledger',
      'data-laras-final-toast',
    ]) {
      expect(larasTemplate).toContain(hook);
    }
  });

  it('keeps the salon gallery directional and single-column on narrow mobile', () => {
    expect(experienceStyles).toContain(':global([data-laras-salon-grid])');
    expect(experienceStyles).toContain('grid-template-columns: repeat(12, minmax(0, 1fr))');
    expect(experienceStyles).toContain('@media (max-width: 36rem)');
    expect(experienceStyles).toContain('grid-template-columns: 1fr');
    expect(experienceStyles).toContain('aspect-ratio: 4 / 5');
    expect(experienceStyles).toContain('aspect-ratio: 16 / 10');
  });

  it('composes response slots as one attendance ledger with a mobile fallback', () => {
    expect(experienceStyles).toContain(':global([data-laras-response-ledger])');
    expect(experienceStyles).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))');
    expect(experienceStyles).toContain(':global([data-response-kind=\'guestbook\'])');
    expect(experienceStyles).toContain(':global([data-personal-rsvp-choices])');
  });

  it('preserves touch, focus, and reduced-motion safeguards', () => {
    expect(experienceStyles).toContain('min-height: 3.15rem');
    expect(experienceStyles).toContain('outline: 3px solid');
    expect(experienceStyles).toContain('@media (prefers-reduced-motion: reduce)');
    expect(experienceStyles).toContain('animation: none !important');
    expect(experienceStyles).toContain('transition: none !important');
  });
});
