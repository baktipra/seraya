import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

async function read(relativePath: string) {
  return readFile(path.resolve(process.cwd(), relativePath), 'utf8');
}

describe('responsive operational workspace contract', () => {
  it('provides explicit desktop, mobile, toolbar, metric, row, and safe-area primitives', async () => {
    const source = await read('src/components/workspace/operational-primitives.tsx');

    for (const primitive of [
      'OperationalDesktopData',
      'OperationalMobileDataList',
      'OperationalMobileDataCard',
      'OperationalMobileField',
      'OperationalResponsiveList',
      'OperationalResponsiveRow',
      'OperationalToolbarField',
      'OperationalSelectionBar',
    ]) {
      expect(source).toContain(`export function ${primitive}`);
    }

    expect(source).toContain('data-operational-header-actions');
    expect(source).toContain('data-operational-section-actions');
    expect(source).toContain('data-operational-selection-actions');
    expect(source).toContain('data-mobile-span={mobileSpan}');
  });

  it('uses canonical operational breakpoints plus the V3 mobile context and drawer', async () => {
    const [source, navigation, navigationCss] = await Promise.all([
      read('src/app/workspace-responsive.css'),
      read('src/components/dashboard/project-navigation.tsx'),
      read('src/components/dashboard/project-navigation.module.css'),
    ]);

    expect(source).toContain('@media (max-width: 767px)');
    expect(source).toContain('@media (max-width: 1023px)');
    expect(source).toContain('[data-project-workspace-main]');
    expect(navigation).toContain('data-project-mobile-context');
    expect(navigationCss).toContain('@media (max-width: 1023px)');
    expect(navigationCss).toContain('.mobileContext {');
    expect(navigationCss).toContain('.mobileOverlay {');
    expect(navigationCss).toContain('z-index: 140;');
    expect(source).not.toContain(':has(');
    expect(source).not.toContain(':nth-child');
    expect(source).not.toContain('aria-labelledby');
    expect(source).not.toContain('data-operational-legacy-bridge');
  });

  it('renders Respons Tamu with separate desktop data and mobile cards', async () => {
    const source = await read('src/components/projects/guest-response-workspace.tsx');

    expect(source).toContain('<OperationalDesktopData>');
    expect(source).toContain('<OperationalMobileDataList>');
    expect(source).toContain('<OperationalMobileDataCard');
    expect(source).toContain('<OperationalMobileField');
    expect(source).toContain('<OperationalToolbarField');
  });

  it('renders Tindak Lanjut through the canonical responsive row contract', async () => {
    const source = await read('src/components/projects/canonical-guest-follow-up-center.tsx');

    expect(source).toContain('<OperationalResponsiveList>');
    expect(source).toContain('<OperationalResponsiveRow');
    expect(source).toContain('mobileSpan="full"');
    expect(source).toContain('<OperationalToolbarField');
  });

  it('renders Tamu and Bagikan with explicit desktop data and mobile cards across their split graphs', async () => {
    const [guestWrapper, guestWorkspace, guestData, deliveryWrapper, deliveryWorkspace, deliveryData] =
      await Promise.all([
        read('src/components/projects/native-guest-manager.tsx'),
        read('src/components/projects/native-guest-manager-workspace.tsx'),
        read('src/components/projects/native-guest-manager-data.tsx'),
        read('src/components/projects/native-guest-delivery-center.tsx'),
        read('src/components/projects/native-guest-delivery-center-workspace.tsx'),
        read('src/components/projects/native-guest-delivery-center-data.tsx'),
      ]);
    const sources = [
      `${guestWrapper}\n${guestWorkspace}\n${guestData}`,
      `${deliveryWrapper}\n${deliveryWorkspace}\n${deliveryData}`,
    ];

    for (const source of sources) {
      expect(source).toContain('<OperationalDesktopData>');
      expect(source).toContain('<OperationalMobileDataList>');
      expect(source).toContain('<OperationalMobileDataCard');
      expect(source).toContain('<OperationalMobileField');
      expect(source).toContain('<OperationalToolbarField');
      expect(source).toContain('<OperationalSelectionBar');
    }
  });
});
