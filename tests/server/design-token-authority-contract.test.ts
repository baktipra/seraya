import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

async function read(relativePath: string) {
  return readFile(path.resolve(process.cwd(), relativePath), 'utf8');
}

describe('design token authority and legacy CSS consolidation', () => {
  it('keeps one canonical token source for palette, type, geometry, spacing, and mobile safety', async () => {
    const tokens = await read('src/app/design-tokens.css');

    for (const token of [
      '--seraya-bg-canvas',
      '--seraya-text-primary',
      '--seraya-type-page-title',
      '--seraya-shell-max',
      '--seraya-workspace-width-operations',
      '--seraya-project-rail-width',
      '--seraya-touch-target',
      '--seraya-mobile-safe-bottom',
      '--seraya-surface-rule',
      '--seraya-sticky-surface',
    ]) {
      expect(tokens).toContain(token);
    }
  });

  it('keeps global CSS free from page-specific Romantic Clarity imports', async () => {
    const globals = await read('src/app/globals.css');

    expect(globals).toContain("@import './design-tokens.css'");
    expect(globals).not.toContain('guest-manager-romantic-clarity.css');
    expect(globals).not.toContain('delivery-center-romantic-clarity.css');
    expect(globals).not.toContain('response-hub-romantic-clarity.css');
    expect(globals).not.toContain('follow-up-romantic-clarity.css');
    expect(globals).not.toContain(':has(');
  });

  it('keeps the remaining general compatibility layer scoped to Ringkasan only', async () => {
    const compatibility = await read('src/app/romantic-clarity-consistency.css');
    const layout = await read('src/app/layout.tsx');

    expect(compatibility).not.toContain(':has(');
    expect(compatibility).not.toContain('#response-panel');
    expect(compatibility).not.toContain('Ringkasan tindak lanjut');
    expect(compatibility).not.toContain('guest-response-workspace-title');
    expect(compatibility).not.toContain('data-operational-legacy-bridge');
    expect(compatibility).toContain("data-workspace-kind='compass'");
    expect(compatibility).not.toContain('guest-manager-title');
    expect(compatibility).not.toContain('delivery-center-title');
    expect(layout).not.toContain('romantic-clarity-editor-consistency.css');
    expect(layout).not.toContain('invitation-mobile-recovery.css');
  });

  it('keeps numeric workspace geometry outside route and component TSX', async () => {
    const page = await read('src/components/workspace/workspace-page.tsx');
    const layout = await read('src/app/(dashboard)/dashboard/[projectId]/layout.tsx');

    expect(page).not.toContain('58rem');
    expect(page).not.toContain('64rem');
    expect(page).not.toContain('74rem');
    expect(layout).not.toContain('15rem');
    expect(layout).not.toContain('gap-8');
  });
});
