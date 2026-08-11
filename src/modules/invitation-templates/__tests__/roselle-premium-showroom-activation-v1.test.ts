import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { createCanonicalShowroomInvitation } from '../showroom/canonical-showroom-invitation';
import {
  activateRosellePremiumShowroom,
  ROSELLE_PREMIUM_SHOWROOM_MEDIA,
} from '../showroom/roselle-premium-showroom';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const showroomRoute = read('src/app/templates/[templateKey]/demo/[surface]/page.tsx');
const showroomActivation = read(
  'src/modules/invitation-templates/showroom/roselle-premium-showroom.ts',
);
const roselleTemplate = read('src/modules/invitation-templates/roselle/roselle-template.tsx');
const roselleSections = read('src/modules/invitation-templates/roselle/roselle-sections.tsx');

describe('J1.3A Roselle Premium Media Showroom Activation & Visual Composition Pass', () => {
  it('activates dedicated cover, portraits and story media instead of exercising gallery fallback', () => {
    const baseline = createCanonicalShowroomInvitation('roselle');
    const invitation = activateRosellePremiumShowroom(baseline, 'roselle');

    expect(invitation.premiumMedia?.coverImage).toEqual(ROSELLE_PREMIUM_SHOWROOM_MEDIA.cover);
    expect(invitation.premiumMedia?.storyImage).toEqual(ROSELLE_PREMIUM_SHOWROOM_MEDIA.story);
    expect(invitation.couple.personOne.portrait).toEqual(ROSELLE_PREMIUM_SHOWROOM_MEDIA.personOne);
    expect(invitation.couple.personTwo.portrait).toEqual(ROSELLE_PREMIUM_SHOWROOM_MEDIA.personTwo);
    expect(invitation.premiumMedia?.coverImage?.src).not.toBe(invitation.gallery?.images[0]?.src);
    expect(invitation.gallery?.images[0]?.src).toMatch(/^data:image\/svg\+xml/);
  });

  it('proves per-person social identity on the actual Roselle showroom view model', () => {
    const invitation = activateRosellePremiumShowroom(
      createCanonicalShowroomInvitation('roselle'),
      'roselle',
    );

    expect(invitation.couple.personOne.socialLinks?.map((link) => link.provider)).toEqual([
      'instagram',
      'website',
    ]);
    expect(invitation.couple.personTwo.socialLinks?.map((link) => link.provider)).toEqual([
      'tiktok',
      'website',
    ]);
    expect(roselleSections).toContain('data-roselle-person-socials');
    expect(roselleSections).toContain('data-social-provider={link.provider}');
  });

  it('activates a standalone privacy-enhanced Wedding Film before gallery without autoplay', () => {
    const invitation = activateRosellePremiumShowroom(
      createCanonicalShowroomInvitation('roselle'),
      'roselle',
    );
    const filmIndex = roselleTemplate.indexOf('<RoselleWeddingFilm');
    const galleryIndex = roselleTemplate.indexOf('<RoselleGallery');

    expect(invitation.premiumMedia?.weddingFilm?.embedHref).toBe(
      'https://www.youtube-nocookie.com/embed/n0hH4xfEyH0',
    );
    expect(invitation.premiumMedia?.weddingFilm?.watchHref).toBe(
      'https://www.youtube.com/watch?v=n0hH4xfEyH0',
    );
    expect(invitation.premiumMedia?.weddingFilm?.caption).toContain('CC BY 3.0');
    expect(filmIndex).toBeGreaterThanOrEqual(0);
    expect(galleryIndex).toBeGreaterThan(filmIndex);
    expect(roselleSections).toContain('loading="lazy"');
    expect(roselleSections).not.toContain('autoplay');
  });

  it('keeps the activation showroom-only and leaves Aruna and Laras untouched', () => {
    const aruna = createCanonicalShowroomInvitation('aruna');
    const laras = createCanonicalShowroomInvitation('laras');

    expect(activateRosellePremiumShowroom(aruna, 'aruna')).toBe(aruna);
    expect(activateRosellePremiumShowroom(laras, 'laras')).toBe(laras);
    expect(showroomActivation).not.toContain('guestToken');
    expect(showroomActivation).not.toContain('supabase');
    expect(showroomActivation).not.toContain('rsvp');
  });

  it('routes both showroom surfaces through one activated production renderer without changing privacy semantics', () => {
    expect(showroomRoute).toContain('activateRosellePremiumShowroom(');
    expect(showroomRoute).toContain('InvitationTemplateRenderer');
    expect(showroomRoute).toContain(
      "const personalSlots = surface === 'personal' ? createCanonicalShowroomPersonalSlots() : undefined",
    );
    expect(showroomRoute).toContain(
      "data-roselle-premium-showroom={templateKey === 'roselle' ? 'j1.3a' : undefined}",
    );
    expect(showroomRoute).not.toContain(
      "[data-template='roselle'] [data-roselle-chapter='opening']{background-image",
    );
  });

  it('locks showroom-specific portrait composition and the 430/390/360 mobile proof floor', () => {
    expect(showroomRoute).toContain("data-roselle-premium-showroom='j1.3a'");
    expect(showroomRoute).toContain('transform:scale(1.42)');
    expect(showroomRoute).toContain('transform-origin:31% 47%');
    expect(showroomRoute).toContain('transform-origin:69% 47%');
    expect(showroomRoute).toContain('@media(max-width:430px)');
    expect(showroomRoute).toContain('@media(max-width:390px)');
    expect(showroomRoute).toContain('@media(max-width:360px)');
  });
});
