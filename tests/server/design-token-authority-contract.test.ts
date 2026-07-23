import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

async function read(relativePath: string) {
  return readFile(path.resolve(process.cwd(), relativePath), 'utf8');
}

function absolute(relativePath: string) {
  return path.resolve(process.cwd(), relativePath);
}

describe('design token authority and final legacy CSS removal', () => {
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

  it('keeps global and root CSS imports free from page-specific compatibility layers', async () => {
    const [globals, layout] = await Promise.all([
      read('src/app/globals.css'),
      read('src/app/layout.tsx'),
    ]);

    expect(globals).toContain("@import './design-tokens.css'");

    for (const legacy of [
      'guest-manager-romantic-clarity.css',
      'delivery-center-romantic-clarity.css',
      'response-hub-romantic-clarity.css',
      'follow-up-romantic-clarity.css',
      'romantic-clarity-consistency.css',
      'romantic-clarity-editor-consistency.css',
      'invitation-mobile-recovery.css',
    ]) {
      expect(globals).not.toContain(legacy);
      expect(layout).not.toContain(legacy);
    }

    expect(globals).not.toContain(':has(');
  });

  it('removes the final Ringkasan compatibility stylesheet from the repository', async () => {
    await expect(access(absolute('src/app/romantic-clarity-consistency.css'))).rejects.toThrow();
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
