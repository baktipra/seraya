import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

async function read(relativePath: string) {
  return readFile(path.resolve(process.cwd(), relativePath), 'utf8');
}

describe('canonical operational workspace primitives', () => {
  it('defines one reusable operational workspace contract', async () => {
    const source = await read('src/components/workspace/operational-primitives.tsx');

    for (const primitive of [
      'OperationalWorkspace',
      'OperationalHeader',
      'OperationalMetricStrip',
      'OperationalMetric',
      'OperationalSection',
      'OperationalToolbar',
      'OperationalDataSurface',
      'OperationalEmptyState',
      'OperationalSelectionBar',
      'OperationalLegacyBridge',
    ]) {
      expect(source).toContain(`export function ${primitive}`);
    }

    expect(source).not.toContain(':has(');
    expect(source).not.toContain('nth-child');
    expect(source).not.toContain('aria-label=');
  });

  it('migrates response and follow-up workspaces to native primitives', async () => {
    const [responses, followUp] = await Promise.all([
      read('src/components/projects/guest-response-workspace.tsx'),
      read('src/components/projects/canonical-guest-follow-up-center.tsx'),
    ]);

    for (const source of [responses, followUp]) {
      expect(source).toContain('<OperationalWorkspace');
      expect(source).toContain('<OperationalHeader');
      expect(source).toContain('<OperationalMetricStrip');
      expect(source).toContain('<OperationalSection');
      expect(source).toContain('<OperationalDataSurface');
    }
  });

  it('places guests and delivery inside the explicit migration bridge', async () => {
    const [guests, delivery] = await Promise.all([
      read('src/app/(dashboard)/dashboard/[projectId]/guests/page.tsx'),
      read('src/app/(dashboard)/dashboard/[projectId]/delivery/page.tsx'),
    ]);

    expect(guests).toContain('<OperationalLegacyBridge kind="guests">');
    expect(delivery).toContain('<OperationalLegacyBridge kind="delivery">');
  });
});
