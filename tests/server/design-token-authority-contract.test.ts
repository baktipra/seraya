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

  it('limits global page compatibility imports to Tamu and Bagikan', async () => {
    const globals = await read('src/app/globals.css');

    expect(globals).toContain("@import './design-tokens.css'");
    expect(globals).toContain("@import './guest-manager-romantic-clarity.css'");
    expect(globals).toContain("@import './delivery-center-romantic-clarity.css'");
    expect(globals).not.toContain('response-hub-romantic-clarity.css');
    expect(globals).not.toContain('follow-up-romantic-clarity.css');
    expect(globals).not.toContain(':has(');
  });

  it('prevents legacy consistency layers from targeting native operational workspaces', async () => {
    const compatibility = await read('src/app/romantic-clarity-consistency.css');
    const editor = await read('src/app/romantic-clarity-editor-consistency.css');

    for (const source of [compatibility, editor]) {
      expect(source).not.toContain(':has(');
      expect(source).not.toContain('#response-panel');
      expect(source).not.toContain('Ringkasan tindak lanjut');
      expect(source).not.toContain('guest-response-workspace-title');
    }

    expect(compatibility).toContain("data-operational-legacy-bridge='guests'");
    expect(compatibility).toContain("data-operational-legacy-bridge='delivery'");
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
