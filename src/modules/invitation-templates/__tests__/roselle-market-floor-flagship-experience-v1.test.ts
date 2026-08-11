import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const roselleTemplate = readFileSync(
  join(process.cwd(), 'src/modules/invitation-templates/roselle/roselle-template.tsx'),
  'utf8',
);
const roselleMarketFloorStyles = readFileSync(
  join(process.cwd(), 'src/modules/invitation-templates/roselle/roselle-market-floor-v1.module.css'),
  'utf8',
);
const audioControl = readFileSync(
  join(process.cwd(), 'src/components/invitation-audio-playback-control.tsx'),
  'utf8',
);

describe('J1.1 Roselle market-floor flagship experience contract', () => {
  it('turns the Roselle opening into one personal market-floor gate', () => {
    expect(roselleTemplate).toContain('data-roselle-market-floor="v1"');
    expect(roselleTemplate).toContain('data-roselle-opening-gate="market-floor-v1"');

    const gateIndex = roselleTemplate.indexOf('data-roselle-opening-gate="market-floor-v1"');
    const greetingIndex = roselleTemplate.indexOf('data-template-personal-greeting="roselle"');
    const openIndex = roselleTemplate.indexOf('data-roselle-opening-action');
    const coupleIndex = roselleTemplate.indexOf('<RoselleCouple');

    expect(gateIndex).toBeGreaterThanOrEqual(0);
    expect(greetingIndex).toBeGreaterThan(gateIndex);
    expect(openIndex).toBeGreaterThan(greetingIndex);
    expect(coupleIndex).toBeGreaterThan(openIndex);
    expect(roselleTemplate).toContain('href="#roselle-couple-title"');
  });

  it('uses the existing audio capability as the Roselle opening ritual', () => {
    expect(audioControl).toContain("target.closest('[data-roselle-opening-action]')");
    expect(audioControl).toContain("templateKey !== 'roselle'");
    expect(audioControl).toContain('void startPlayback()');
    expect(audioControl).toContain('data-audio-opening-sync');
    expect(audioControl).toContain("'roselle-market-floor-v1'");
  });

  it('keeps event capability inside the Roselle schedule while promoting countdown before event copy', () => {
    expect(roselleTemplate).toContain('data-roselle-celebration-thread');
    expect(roselleTemplate).toContain('<TemplateEventJourneyUtility');
    expect(roselleMarketFloorStyles).toContain("[data-template-event-utility='roselle']");
    expect(roselleMarketFloorStyles).toContain('[data-template-event-countdown]');
    expect(roselleMarketFloorStyles).toContain("[data-roselle-chapter='events']");
    expect(roselleMarketFloorStyles).toContain('order: 1');
    expect(roselleMarketFloorStyles).toContain('order: 2');
    expect(roselleMarketFloorStyles).toContain('[data-template-event-action-list]');
    expect(roselleMarketFloorStyles).toContain('order: 3');
  });

  it('makes farewell own the final navigation instead of restoring an app-like postscript', () => {
    const farewellIndex = roselleTemplate.indexOf('data-roselle-farewell="market-floor-v1"');
    const closingIndex = roselleTemplate.indexOf('<RoselleClosing');
    const returnIndex = roselleTemplate.indexOf('data-roselle-return-to-opening');

    expect(farewellIndex).toBeGreaterThanOrEqual(0);
    expect(closingIndex).toBeGreaterThan(farewellIndex);
    expect(returnIndex).toBeGreaterThan(closingIndex);
    expect(roselleMarketFloorStyles).toContain('.farewell');
  });

  it('locks Roselle to the primary 430, 390, and 360 guest viewports', () => {
    expect(roselleMarketFloorStyles).toContain('@media (max-width: 26.875rem)');
    expect(roselleMarketFloorStyles).toContain('@media (max-width: 24.375rem)');
    expect(roselleMarketFloorStyles).toContain('@media (max-width: 22.5rem)');
    expect(roselleMarketFloorStyles).toContain('min-height: 100svh');
  });

  it('keeps J1.1 presentation safety while allowing later canonical wedding-media capabilities', () => {
    expect(roselleTemplate).toContain("invitation.premiumMedia?.coverImage");
    expect(roselleTemplate).toContain("invitation.gallery?.images[0]");
    expect(roselleMarketFloorStyles).not.toMatch(/url\(['"]?https?:\/\//);
    expect(roselleMarketFloorStyles).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
