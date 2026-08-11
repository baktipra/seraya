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
const galleryViewer = readFileSync(
  join(process.cwd(), 'src/modules/invitation-templates/roselle/roselle-gallery-viewer.tsx'),
  'utf8',
);
const galleryViewerStyles = readFileSync(
  join(
    process.cwd(),
    'src/modules/invitation-templates/roselle/roselle-gallery-viewer.module.css',
  ),
  'utf8',
);
const immersiveStyles = readFileSync(
  join(
    process.cwd(),
    'src/modules/invitation-templates/roselle/roselle-immersive-experience-v1.module.css',
  ),
  'utf8',
);
const sharedEventUtility = readFileSync(
  join(process.cwd(), 'src/modules/invitation-templates/template-event-journey-utility.tsx'),
  'utf8',
);

describe('J1.4 Roselle immersive gallery and venue experience contract', () => {
  it('adds one Roselle-only immersive presentation layer without replacing the locked template journey', () => {
    expect(roselleTemplate).toContain(
      "import immersiveStyles from './roselle-immersive-experience-v1.module.css'",
    );
    expect(roselleTemplate).toContain('${immersiveStyles.immersive}');
    expect(roselleTemplate).toContain('data-roselle-immersive="v1"');
    expect(roselleTemplate).toContain('<TemplateEventJourneyUtility');
    expect(roselleTemplate).toContain('<RoselleWeddingFilm');
    expect(roselleTemplate).toContain('<RoselleGallery gallery={invitation.gallery} />');
  });

  it('keeps the editorial mosaic as the entry surface and adds a full-screen gallery viewer', () => {
    expect(roselleSections).toContain("import { RoselleGalleryViewer } from './roselle-gallery-viewer'");
    expect(roselleSections).toContain('<RoselleGalleryViewer images={gallery.images} layout={galleryLayout} />');
    expect(galleryViewer).toContain('data-roselle-gallery-open');
    expect(galleryViewer).toContain('data-roselle-gallery-lightbox="v1"');
    expect(galleryViewer).toContain('createPortal(');
    expect(galleryViewer).toContain('aria-modal="true"');
    expect(galleryViewer).toContain('role="dialog"');
  });

  it('supports keyboard close/navigation, swipe navigation, scroll locking, and focus restoration', () => {
    expect(galleryViewer).toContain("event.key === 'Escape'");
    expect(galleryViewer).toContain("event.key === 'ArrowLeft'");
    expect(galleryViewer).toContain("event.key === 'ArrowRight'");
    expect(galleryViewer).toContain('Math.abs(distance) < 48');
    expect(galleryViewer).toContain("document.body.style.overflow = 'hidden'");
    expect(galleryViewer).toContain('restoreFocusRef.current?.focus()');
  });

  it('keeps gallery controls touch-safe and mobile-specific at 430, 390, and 360 widths', () => {
    expect(galleryViewerStyles).toContain('min-height: 2.75rem');
    expect(galleryViewerStyles).toContain('@media (max-width: 430px)');
    expect(galleryViewerStyles).toContain('@media (max-width: 390px)');
    expect(galleryViewerStyles).toContain('@media (max-width: 360px)');
    expect(galleryViewerStyles).toContain('@media (prefers-reduced-motion: reduce)');
    expect(galleryViewerStyles).toContain('object-fit: contain');
  });

  it('turns the existing Roselle event utility into a venue-led composition without forking shared behavior', () => {
    expect(immersiveStyles).toContain("[data-template-event-utility='roselle']");
    expect(immersiveStyles).toContain('[data-template-event-utility-item]');
    expect(immersiveStyles).toContain('> div:has(> iframe)');
    expect(immersiveStyles).toContain("content: 'Peta lokasi · buka rute untuk navigasi'");
    expect(immersiveStyles).toContain('min-height: 2.75rem');
    expect(sharedEventUtility).toContain('getGuestEventMapEmbedHref');
    expect(sharedEventUtility).toContain('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY');
    expect(sharedEventUtility).toContain('TemplateEventJourneyUtility');
    expect(sharedEventUtility).not.toContain('data-roselle-immersive');
  });

  it('adds restrained view-entry motion while preserving reduced-motion behavior', () => {
    expect(immersiveStyles).toContain('@supports (animation-timeline: view())');
    expect(immersiveStyles).toContain('@keyframes roselle-venue-arrival');
    expect(immersiveStyles).toContain('@media (prefers-reduced-motion: reduce)');
    expect(immersiveStyles).toContain('animation: none');
  });
});
