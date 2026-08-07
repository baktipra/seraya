import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

async function read(relativePath: string) {
  return readFile(path.resolve(process.cwd(), relativePath), 'utf8');
}

describe('cross-workspace accessibility and interaction release contract', () => {
  it('provides a keyboard skip target and route-change focus announcement for project workspaces', async () => {
    const layout = await read('src/app/(dashboard)/dashboard/[projectId]/layout.tsx');
    const page = await read('src/components/workspace/workspace-page.tsx');
    const navigation = await read('src/components/dashboard/project-navigation.tsx');

    expect(layout).toContain('seraya-skip-link');
    expect(layout).toContain('href="#project-workspace-content"');
    expect(page).toContain('id="project-workspace-content"');
    expect(page).toContain('tabIndex={-1}');
    expect(navigation).toContain("getElementById('project-workspace-content')");
    expect(navigation).toContain('aria-live="polite"');
    expect(navigation).toContain('Halaman ${getProjectRouteLabel(pathname, projectId)} dibuka.');
  });

  it('keeps full navigation names available to assistive technology', async () => {
    const navigation = await read('src/components/dashboard/project-navigation.tsx');

    expect(navigation).toContain('<span>{item.label}</span>');
    expect(navigation).toContain('aria-hidden="true"');
    expect(navigation).toContain('focusable="false"');
  });

  it('traps and restores focus for dialogs and the Invitation Studio preview overlay', async () => {
    const dialog = await read('src/design-system/primitives/dialog.tsx');
    const preview = await read('src/components/projects/invitation-editor-live-preview.tsx');
    const focus = await read('src/lib/focus-management.ts');

    expect(dialog).toContain('trapFocusWithin');
    expect(dialog).toContain('previousFocusRef');
    expect(dialog).toContain('aria-modal="true"');
    expect(preview).toContain('trapFocusWithin');
    expect(preview).toContain('openerRef');
    expect(preview).toContain("role={isOpen ? 'dialog' : 'complementary'}");
    expect(focus).toContain("event.key !== 'Tab'");
    expect(focus).toContain('getFocusableElements');
    expect(preview).toContain('Pratinjau undangan yang dapat digulir');
  });

  it('supports keyboard-complete row menus and canonical touch targets', async () => {
    const menu = await read('src/components/projects/row-overflow-menu.tsx');
    const button = await read('src/design-system/primitives/button.tsx');

    for (const key of ['ArrowDown', 'ArrowUp', 'Home', 'End']) {
      expect(menu).toContain(key);
    }

    expect(menu).toContain('aria-controls={menuId}');
    expect(menu).toContain('focusFirstDescendant(menuRef.current)');
    expect(menu).toContain('min-h-11 min-w-11');
    expect(button).toContain("sm: 'min-h-[var(--seraya-touch-target)]");
  });

  it('adds semantic search, data regions, empty states, and selection announcements to shared operations', async () => {
    const primitives = await read('src/components/workspace/operational-primitives.tsx');

    expect(primitives).toContain('role="search"');
    expect(primitives).toContain('role="region"');
    expect(primitives).toContain('tabIndex={0}');
    expect(primitives).toContain('data-operational-empty-state');
    expect(primitives).toContain('aria-live="polite"');
    expect(primitives).toContain('Aksi item terpilih');
  });

  it('loads one explicit accessibility release layer with reduced-motion and forced-colors support', async () => {
    const layout = await read('src/app/layout.tsx');
    const css = await read('src/app/accessibility-release.css');

    expect(layout).toContain("import './accessibility-release.css'");
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('@media (forced-colors: active)');
    expect(css).toContain('.seraya-skip-link:focus-visible');
    expect(css).not.toContain(':has(');
    expect(css).not.toContain(':nth-child(');
  });
});
