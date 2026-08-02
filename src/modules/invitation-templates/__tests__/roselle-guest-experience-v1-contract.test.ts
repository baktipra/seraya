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
const experienceStyles = readFileSync(
  join(
    process.cwd(),
    'src/modules/invitation-templates/roselle/roselle-guest-experience.module.css',
  ),
  'utf8',
);

describe('Slice G1 Roselle guest experience contract', () => {
  it('activates one template-owned intimate-letter presentation authority', () => {
    expect(roselleTemplate).toContain("import experienceStyles from './roselle-guest-experience.module.css'");
    expect(roselleTemplate).toContain('experienceStyles.experience');
    expect(roselleTemplate).toContain('data-roselle-experience="letter-v1"');
    expect(experienceStyles).toContain(".experience[data-roselle-experience='letter-v1']");
  });

  it('keeps generic and personal response authority unchanged', () => {
    expect(roselleTemplate).toContain("renderContext.surface !== 'personal'");
    expect(roselleTemplate).toContain('getPersonalInvitationPresentationSlots(renderContext)');
    expect(roselleTemplate).toContain('data-generic-response-note="roselle"');
    expect(roselleTemplate).toContain('data-template-response-slot="rsvp"');
    expect(roselleTemplate).toContain('data-template-response-slot="guestbook"');
  });

  it('composes the addressed greeting directly after the opening action', () => {
    const openingAction = roselleTemplate.indexOf('data-roselle-opening-action');
    const greeting = roselleTemplate.indexOf('data-roselle-addressed-letter');
    const couple = roselleTemplate.indexOf('<RoselleCouple');

    expect(openingAction).toBeGreaterThan(-1);
    expect(greeting).toBeGreaterThan(openingAction);
    expect(couple).toBeGreaterThan(greeting);
  });

  it('defines stable hooks for the full romantic-letter journey', () => {
    for (const hook of [
      'data-roselle-letter',
      'data-roselle-couple-composition',
      'data-roselle-story-letter',
      'data-roselle-event-thread',
      'data-roselle-location-note',
      'data-roselle-memory-album',
      'data-roselle-gift-enclosure',
      'data-roselle-letter-closing',
    ]) {
      expect(roselleSections).toContain(hook);
    }
  });

  it('keeps the memory album lead-first and single-column on narrow mobile', () => {
    expect(experienceStyles).toContain("[data-roselle-memory-album][data-gallery-layout='mosaic']");
    expect(experienceStyles).toContain('@media (max-width: 36rem)');
    expect(experienceStyles).toContain('grid-template-columns: 1fr');
    expect(experienceStyles).toContain('aspect-ratio: 4 / 5');
    expect(experienceStyles).toContain('aspect-ratio: 4 / 3');
  });

  it('preserves touch, focus, and reduced-motion safeguards', () => {
    expect(experienceStyles).toContain('min-height: 3.15rem');
    expect(experienceStyles).toContain('outline: 3px solid');
    expect(experienceStyles).toContain('@media (prefers-reduced-motion: reduce)');
    expect(experienceStyles).toContain('animation: none');
    expect(experienceStyles).toContain('transition: none');
  });
});
