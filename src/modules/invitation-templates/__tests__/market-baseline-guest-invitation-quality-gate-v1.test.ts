import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

const parityBoundary = readSource(
  'src/modules/invitation-templates/invitation-template-parity-boundary.tsx',
);
const eventUtility = readSource(
  'src/modules/invitation-templates/template-event-journey-utility.tsx',
);
const eventUtilityStyles = readSource(
  'src/modules/invitation-templates/template-event-journey-utility.module.css',
);
const roselle = readSource('src/modules/invitation-templates/roselle/roselle-template.tsx');
const aruna = readSource('src/modules/invitation-templates/aruna/aruna-template.tsx');
const laras = readSource('src/modules/invitation-templates/laras/laras-template.tsx');

const templates = [
  ['roselle', roselle],
  ['aruna', aruna],
  ['laras', laras],
] as const;

describe('J1 Market Baseline Guest Invitation Quality Gate V1', () => {
  it('marks the collection boundary and removes detached post-closing utility composition', () => {
    expect(parityBoundary).toContain('data-market-quality-gate="v1"');
    expect(parityBoundary).not.toContain("import { GuestEventUtility }");
    expect(parityBoundary).not.toContain('<GuestEventUtility');
  });

  it.each(templates)('keeps event actions inside the %s invitation journey', (templateKey, source) => {
    expect(source).toContain("import { TemplateEventJourneyUtility }");
    expect(source).toContain('<TemplateEventJourneyUtility');
    expect(source).toContain(`templateKey="${templateKey}"`);
    expect(source.indexOf('<TemplateEventJourneyUtility')).toBeLessThan(
      source.indexOf(`${templateKey}-closing-title`),
    );
  });

  it('preserves the operational event capabilities while changing their presentation layer', () => {
    expect(eventUtility).toContain('createGuestEventCalendarFile');
    expect(eventUtility).toContain('getGoogleCalendarHref');
    expect(eventUtility).toContain('getGuestEventRouteHref');
    expect(eventUtility).toContain('getGuestEventMapEmbedHref');
    expect(eventUtility).toContain('getRemoteAttendancePresentation');
    expect(eventUtility).toContain('getYoutubeEmbedHref');
    expect(eventUtility).toContain('data-template-event-countdown');
    expect(eventUtility).toContain('data-template-event-action-list');
    expect(eventUtility).toContain('data-template-native-utility="v1"');
  });

  it('keeps the utility visually template-aware instead of restoring one SaaS shell', () => {
    for (const templateKey of ['roselle', 'aruna', 'laras']) {
      expect(eventUtilityStyles).toContain(`[data-template-event-utility='${templateKey}']`);
    }

    expect(eventUtilityStyles).toContain('@media (max-width: 36rem)');
    expect(eventUtilityStyles).toContain('@media (prefers-reduced-motion: reduce)');
    expect(eventUtilityStyles).not.toContain('display: none');
  });
});
