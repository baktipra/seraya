import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const draftSchema = read('src/modules/invitations/invitation-draft.schema.ts');
const imageService = read('src/modules/media/invitation-image.service.ts');
const mediaRepository = read('src/modules/media/media.repository.ts');
const publicMediaService = read('src/modules/media/public-media.service.ts');
const viewModel = read('src/modules/invitation-templates/invitation-view-model.ts');
const roselleTemplate = read('src/modules/invitation-templates/roselle/roselle-template.tsx');
const roselleSections = read('src/modules/invitation-templates/roselle/roselle-sections.tsx');
const premiumStyles = read(
  'src/modules/invitation-templates/roselle/roselle-premium-media-v1.module.css',
);
const mediaStudio = read('src/components/projects/invitation-studio-media-mode.tsx');
const premiumManager = read('src/components/projects/premium-guest-media-manager.tsx');
const genericRoute = read('src/app/[slug]/page.tsx');
const personalRoute = read('src/app/[slug]/g/[guestToken]/page.tsx');

describe('J1.3 Couple Media, Cover, Wedding Film & Premium Guest Media Foundation', () => {
  it('adds one backward-compatible premiumMedia contract without replacing schema V1', () => {
    expect(draftSchema).toContain('INVITATION_DRAFT_SCHEMA_VERSION = 1');
    expect(draftSchema).toContain('const createDefaultPremiumMedia');
    expect(draftSchema).toContain('premiumMedia: premiumMediaSchema.default(createDefaultPremiumMedia)');
    expect(draftSchema).toContain('coverImageId');
    expect(draftSchema).toContain('storyImageId');
    expect(draftSchema).toContain('personOne: premiumPersonSchema');
    expect(draftSchema).toContain('personTwo: premiumPersonSchema');
  });

  it('keeps uploaded premium images private and role-owned instead of hiding them inside gallery membership', () => {
    expect(imageService).toContain("INVITATION_IMAGE_MEDIA_KIND");
    expect(imageService).toContain('projects/${input.projectId}/featured/${input.role}/');
    expect(imageService).toContain('finalizeInvitationImageMediaAssetWithAdmin');
    expect(mediaRepository).toContain("input.mediaKind === GALLERY_IMAGE_MEDIA_KIND");
    expect(mediaRepository).toContain("input.mediaKind !== INVITATION_IMAGE_MEDIA_KIND");
    expect(mediaRepository).toContain("draft.premiumMedia?.coverImageId");
  });

  it('authorizes public premium binaries only through the current published snapshot', () => {
    expect(publicMediaService).toContain('getPublicPremiumMediaImagesForCurrentSnapshot');
    expect(genericRoute).toContain('getPublicPremiumMediaImagesForCurrentSnapshot');
    expect(personalRoute).toContain('getPublicPremiumMediaImagesForCurrentSnapshot');
    expect(genericRoute).toContain('premiumMediaImages');
    expect(personalRoute).toContain('premiumMediaImages');
    expect(personalRoute).toContain("surface=\"personal\"");
    expect(genericRoute).toContain("surface=\"generic\"");
  });

  it('gives Roselle dedicated cover, individual portraits and per-person social identity while preserving gallery fallback', () => {
    expect(viewModel).toContain('portrait?: InvitationGalleryImage | null');
    expect(viewModel).toContain('socialLinks?: InvitationSocialLinkViewModel[]');
    expect(roselleTemplate).toContain("const featuredCover = invitation.premiumMedia?.coverImage ?? null");
    expect(roselleTemplate).toContain('featuredCover ?? invitation.gallery?.images[0] ?? null');
    expect(roselleTemplate).toContain("featuredCover ? 'featured-cover'");
    expect(roselleSections).toContain('data-roselle-person-media');
    expect(roselleSections).toContain('data-roselle-person-socials');
  });

  it('adds a standalone YouTube Wedding Film before gallery without autoplay or an uploaded-video pipeline', () => {
    const filmIndex = roselleTemplate.indexOf('<RoselleWeddingFilm');
    const galleryIndex = roselleTemplate.indexOf('<RoselleGallery');

    expect(filmIndex).toBeGreaterThanOrEqual(0);
    expect(galleryIndex).toBeGreaterThan(filmIndex);
    expect(draftSchema).toContain("getYoutubeVideoId(premiumMedia.weddingFilm.url)");
    expect(viewModel).toContain('getYoutubeEmbedHref');
    expect(roselleSections).toContain('loading="lazy"');
    expect(roselleSections).not.toContain('autoplay');
    expect(roselleSections).not.toContain('<video');
  });

  it('makes premium media first-class in the owner Media workspace', () => {
    expect(mediaStudio).toContain("'audio' | 'featured' | 'gallery'");
    expect(mediaStudio).toContain('<PremiumGuestMediaManager');
    expect(premiumManager).toContain('Cover utama');
    expect(premiumManager).toContain('Mempelai pertama');
    expect(premiumManager).toContain('Mempelai kedua');
    expect(premiumManager).toContain('Foto cerita');
    expect(premiumManager).toContain('Wedding Film');
  });

  it('keeps Roselle premium media responsive and avoids external decorative CSS assets', () => {
    expect(premiumStyles).toContain('@media (max-width: 430px)');
    expect(premiumStyles).toContain('min-height: 2.75rem');
    expect(premiumStyles).toContain('@media (prefers-reduced-motion: reduce)');
    expect(premiumStyles).not.toMatch(/url\(['"]?https?:\/\//);
  });
});
