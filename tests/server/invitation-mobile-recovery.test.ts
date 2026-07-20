import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

describe('P0 mobile invitation workspace recovery', () => {
  it('contains editor overflow and keeps fixed owner navigation bound to the viewport', async () => {
    const [layout, source] = await Promise.all([
      readFile(path.resolve(process.cwd(), 'src/app/layout.tsx'), 'utf8'),
      readFile(path.resolve(process.cwd(), 'src/app/invitation-mobile-recovery.css'), 'utf8'),
    ]);

    expect(layout).toContain("import './invitation-mobile-recovery.css';");
    expect(source).toContain("html:has(#invitation-editor-title)");
    expect(source).toContain("nav[aria-label='Navigasi workspace mobile']");
    expect(source).toContain('max-width: 100vw !important;');
    expect(source).toContain('[data-invitation-editor-mobile-navigation]');
    expect(source).toContain('[data-invitation-editor-mobile-section-strip]');
    expect(source).toContain("[data-testid='invitation-editor-save-status']");
    expect(source).toContain('bottom: calc(4.5rem + env(safe-area-inset-bottom)) !important;');
    expect(source).toContain('aside[data-local-preview-overlay]');
    expect(source).toContain('width: 100dvw !important;');
  });
});
