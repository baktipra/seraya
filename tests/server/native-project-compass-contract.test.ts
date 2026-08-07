import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

async function read(relativePath: string) {
  return readFile(path.resolve(process.cwd(), relativePath), 'utf8');
}

describe('native project compass workspace', () => {
  it('defines explicit compass primitives without legacy selector authority', async () => {
    const source = await read('src/components/workspace/compass-primitives.tsx');

    for (const primitive of [
      'CompassWorkspace',
      'CompassHeader',
      'CompassFocus',
      'CompassSectionHeader',
      'CompassProgressStrip',
      'CompassProgressItem',
      'CompassAttentionList',
      'CompassAttentionItem',
      'CompassClearState',
    ]) {
      expect(source).toContain(`export function ${primitive}`);
    }

    expect(source).toContain('data-compass-workspace');
    expect(source).toContain('data-compass-header');
    expect(source).toContain('data-compass-focus');
    expect(source).not.toContain(':has(');
    expect(source).not.toContain('!important');
    expect(source).not.toContain('querySelector');
  });

  it('keeps Ringkasan on the accepted V3 editorial aggregate while preserving readiness truth', async () => {
    const source = await read('src/components/projects/project-overview-bootstrap.tsx');

    expect(source).toContain('data-owner-workspace-editorial-dashboard="v3"');
    expect(source).toContain('getInvitationStatus');
    expect(source).toContain('getJourney');
    expect(source).toContain('getNextSteps');
    expect(source).toContain('readiness.invitation.hasPublishedSnapshot');
    expect(source).toContain('readiness.invitation.hasUnpublishedChanges');
    expect(source).toContain('readiness.guests.activeGuestCount');
    expect(source).toContain('readiness.responses.nonPendingRsvpCount');
    expect(source).toContain('readiness.guests.readyToDistributeCount ?? 0');
    expect(source).toContain("href: `${base}/invitation` as Route");
    expect(source).toContain("href: `${base}/invitation?task=publish` as Route");
    expect(source).toContain("href: `${base}/guests` as Route");
    expect(source).toContain("href: `${base}/rsvp` as Route");
    expect(source).not.toContain('.from(');
    expect(source).not.toContain('max-w-5xl');
  });

  it('keeps Ringkasan on the wider operations canvas used by the accepted V3 dashboard', async () => {
    const route = await read('src/app/(dashboard)/dashboard/[projectId]/page.tsx');

    expect(route).toContain('<WorkspacePage kind="compass" width="operations">');
    expect(route).toContain('<ProjectOverviewBootstrap');
  });
});
