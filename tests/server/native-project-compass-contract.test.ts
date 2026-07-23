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

  it('migrates Ringkasan while preserving compass derivation and attention semantics', async () => {
    const source = await read('src/components/projects/project-overview-bootstrap.tsx');

    for (const primitive of [
      '<CompassWorkspace',
      '<CompassHeader',
      '<CompassFocus',
      '<CompassProgressStrip',
      '<CompassProgressItem',
      '<CompassAttentionList',
      '<CompassAttentionItem',
      '<CompassClearState',
    ]) {
      expect(source).toContain(primitive);
    }

    expect(source).toContain('deriveProjectCompassNextStep');
    expect(source).toContain('.filter((item) => !isCoveredByPrimaryStep(item.key, nextStep.key))');
    expect(source).toContain('.slice(0, 3)');
    expect(source).toContain("primaryStepKey === 'review_changes'");
    expect(source).toContain("primaryStepKey === 'prepare_personal_invitations'");
    expect(source).toContain("primaryStepKey === 'view_guest_responses'");
    expect(source).not.toContain('max-w-5xl');
  });

  it('keeps Ringkasan assigned to the canonical compass anatomy and standard width', async () => {
    const route = await read('src/app/(dashboard)/dashboard/[projectId]/page.tsx');

    expect(route).toContain('<WorkspacePage kind="compass" width="standard">');
    expect(route).toContain('<ProjectOverviewBootstrap');
  });
});
