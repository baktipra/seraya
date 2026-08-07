import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

async function read(relativePath: string) {
  return readFile(path.resolve(process.cwd(), relativePath), 'utf8');
}

describe('canonical operational workspace primitives', () => {
  it('defines one reusable operational workspace contract without a legacy bridge', async () => {
    const source = await read('src/components/workspace/operational-primitives.tsx');

    for (const primitive of [
      'OperationalWorkspace',
      'OperationalHeader',
      'OperationalMetricStrip',
      'OperationalMetric',
      'OperationalSection',
      'OperationalToolbar',
      'OperationalToolbarField',
      'OperationalDataSurface',
      'OperationalDesktopData',
      'OperationalMobileDataList',
      'OperationalMobileDataCard',
      'OperationalEmptyState',
      'OperationalSelectionBar',
    ]) {
      expect(source).toContain(`export function ${primitive}`);
    }

    expect(source).not.toContain('OperationalLegacyBridge');
    expect(source).not.toContain('data-operational-legacy-bridge');
    expect(source).not.toContain(':has(');
    expect(source).not.toContain('nth-child');
  });

  it('keeps all four operational workspaces on native primitives across their composition graphs', async () => {
    const [responses, followUp, guestWrapper, guestWorkspace, guestData, deliveryWrapper, deliveryWorkspace, deliveryData] =
      await Promise.all([
        read('src/components/projects/guest-response-workspace.tsx'),
        read('src/components/projects/canonical-guest-follow-up-center.tsx'),
        read('src/components/projects/native-guest-manager.tsx'),
        read('src/components/projects/native-guest-manager-workspace.tsx'),
        read('src/components/projects/native-guest-manager-data.tsx'),
        read('src/components/projects/native-guest-delivery-center.tsx'),
        read('src/components/projects/native-guest-delivery-center-workspace.tsx'),
        read('src/components/projects/native-guest-delivery-center-data.tsx'),
      ]);
    const sources = [
      responses,
      followUp,
      `${guestWrapper}\n${guestWorkspace}\n${guestData}`,
      `${deliveryWrapper}\n${deliveryWorkspace}\n${deliveryData}`,
    ];

    for (const source of sources) {
      expect(source).toContain('<OperationalWorkspace');
      expect(source).toContain('<OperationalHeader');
      expect(source).toContain('<OperationalMetricStrip');
      expect(source).toContain('<OperationalSection');
      expect(source).toContain('<OperationalDataSurface');
    }

    expect(guestWrapper).toContain('<NativeGuestManagerWorkspace');
    expect(deliveryWrapper).toContain('<DeliveryDistributionWorkspace');
  });

  it('routes Tamu and Bagikan directly to their native implementations', async () => {
    const [guests, delivery] = await Promise.all([
      read('src/app/(dashboard)/dashboard/[projectId]/guests/page.tsx'),
      read('src/app/(dashboard)/dashboard/[projectId]/delivery/page.tsx'),
    ]);

    expect(guests).toContain('<NativeGuestManager');
    expect(delivery).toContain('<NativeGuestDeliveryCenter');
    expect(guests).not.toContain('OperationalLegacyBridge');
    expect(delivery).not.toContain('OperationalLegacyBridge');
  });
});
