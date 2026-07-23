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

  it('uses one canonical mobile breakpoint and bottom-navigation safe-area clearance', async () => {
    const source = await read('src/app/workspace-responsive.css');

    expect(source).toContain('@media (max-width: 767px)');
    expect(source).toContain('@media (max-width: 1023px)');
    expect(source).toContain('--seraya-mobile-nav-clearance');
    expect(source).toContain('env(safe-area-inset-bottom)');
    expect(source).toContain("[data-workspace-anatomy='operations']");
    expect(source).not.toContain(':has(');
    expect(source).not.toContain(':nth-child');
    expect(source).not.toContain('aria-labelledby');
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

  it('keeps Tamu and Bagikan inside the explicit legacy migration bridge', async () => {
    const guests = await read('src/app/(dashboard)/dashboard/[projectId]/guests/page.tsx');
    const delivery = await read('src/app/(dashboard)/dashboard/[projectId]/delivery/page.tsx');

    expect(guests).toContain('<OperationalLegacyBridge kind="guests">');
    expect(delivery).toContain('<OperationalLegacyBridge kind="delivery">');
  });
});
