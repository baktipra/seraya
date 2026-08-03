import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const arunaTemplate = readFileSync(
  join(process.cwd(), 'src/modules/invitation-templates/aruna/aruna-template.tsx'),
  'utf8',
);
const experienceStyles = readFileSync(
  join(
    process.cwd(),
    'src/modules/invitation-templates/aruna/aruna-guest-experience.module.css',
  ),
  'utf8',
);

describe('Slice G2 Aruna guest experience contract', () => {
  it('activates one template-owned modern wedding journal authority', () => {
    expect(arunaTemplate).toContain(
      "import experienceStyles from './aruna-guest-experience.module.css'",
    );
    expect(arunaTemplate).toContain('experienceStyles.experience');
    expect(arunaTemplate).toContain('data-aruna-experience="journal-v1"');
    expect(experienceStyles).toContain(".experience[data-aruna-experience='journal-v1']");
  });

  it('preserves generic and personal response authority', () => {
    expect(arunaTemplate).toContain("renderContext.surface !== 'personal'");
    expect(arunaTemplate).toContain('getPersonalInvitationPresentationSlots(renderContext)');
    expect(arunaTemplate).toContain('data-generic-response-note="aruna"');
    expect(arunaTemplate).toContain('data-template-response-slot="rsvp"');
    expect(arunaTemplate).toContain('data-template-response-slot="guestbook"');
  });

  it('places the editor note after opening and before the couple feature', () => {
    const openingAction = arunaTemplate.indexOf('data-aruna-opening-action');
    const editorNote = arunaTemplate.indexOf('data-aruna-editors-note');
    const coupleFeature = arunaTemplate.indexOf('data-aruna-couple-feature');

    expect(openingAction).toBeGreaterThan(-1);
    expect(editorNote).toBeGreaterThan(openingAction);
    expect(coupleFeature).toBeGreaterThan(editorNote);
  });

  it('defines stable hooks for the full wedding journal journey', () => {
    for (const hook of [
      'data-aruna-journal-cover',
      'data-aruna-profile-grid',
      'data-aruna-feature-story',
      'data-aruna-agenda',
      'data-aruna-venue-brief',
      'data-aruna-photo-essay',
      'data-aruna-gift-desk',
      'data-aruna-reader-response',
      'data-aruna-colophon',
    ]) {
      expect(arunaTemplate).toContain(hook);
    }
  });

  it('keeps the photo essay directional on desktop and single-column on narrow mobile', () => {
    expect(experienceStyles).toContain('grid-template-columns: repeat(12, minmax(0, 1fr))');
    expect(experienceStyles).toContain('[data-aruna-photo-frame]:first-child');
    expect(experienceStyles).toContain('@media (max-width: 36rem)');
    expect(experienceStyles).toContain('grid-template-columns: 1fr');
    expect(experienceStyles).toContain('aspect-ratio: 4 / 5');
  });

  it('preserves touch, focus, and reduced-motion safeguards', () => {
    expect(experienceStyles).toContain('min-height: 3.2rem');
    expect(experienceStyles).toContain('outline: 3px solid');
    expect(experienceStyles).toContain('@media (prefers-reduced-motion: reduce)');
    expect(experienceStyles).toContain('animation: none !important');
    expect(experienceStyles).toContain('transition: none !important');
  });
});
