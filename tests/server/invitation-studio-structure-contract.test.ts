import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

async function read(relativePath: string) {
  return readFile(path.resolve(process.cwd(), relativePath), 'utf8');
}

describe('invitation studio structural reconstruction', () => {
  it('keeps the studio shell structural while V1 owns its three-zone workspace geometry', async () => {
    const shell = await read('src/components/projects/invitation-studio-shell.tsx');
    const shellCss = await read('src/components/projects/invitation-studio-shell.module.css');
    const workspaceCss = await read('src/components/projects/invitation-task-workspace.module.css');

    expect(shell).toContain('data-invitation-studio');
    expect(shell).not.toContain('<style>');
    expect(shellCss).not.toContain('[data-invitation-editor-desktop-navigation] + form');
    expect(shellCss).not.toContain('aside[data-local-preview-desktop]');
    expect(workspaceCss).toContain('container-type: inline-size');
    expect(workspaceCss).toContain(
      'grid-template-columns: minmax(10.75rem, 12.25rem) minmax(0, 1fr) minmax(17.5rem, 20rem);',
    );
    expect(workspaceCss).toContain('.sectionRail');
    expect(workspaceCss).toContain('.previewRail');
    expect(workspaceCss).toContain('@container (max-width: 72rem)');
    expect(workspaceCss).toContain('@container (max-width: 52rem)');
    expect(shellCss).not.toContain(':has(');
    expect(workspaceCss).not.toContain(':has(');
    expect(shellCss).not.toContain('display: contents');
  });

  it('keeps publication authority in React without DOM discovery or portals', async () => {
    const publication = await read('src/components/projects/publish-invitation-controls.tsx');
    const stateBridge = await read(
      'src/components/projects/invitation-editor-contextual-actions.ts',
    );

    expect(publication).toContain('useInvitationEditorUnsavedChanges');
    expect(publication).toContain('data-editor-publication-authority');
    expect(publication).not.toContain('createPortal');
    expect(publication).not.toContain('querySelector');
    expect(publication).not.toContain('MutationObserver');
    expect(stateBridge).toContain('useSyncExternalStore');
    expect(stateBridge).not.toContain('querySelector');
    expect(stateBridge).not.toContain('MutationObserver');
    expect(stateBridge).not.toContain('textContent');
  });

  it('returns preview focus without searching rendered DOM and has no inline style recovery', async () => {
    const preview = await read('src/components/projects/invitation-editor-live-preview.tsx');
    const previewCss = await read(
      'src/components/projects/invitation-editor-live-preview.module.css',
    );

    expect(preview).toContain('document.activeElement');
    expect(preview).toContain('openerRef.current?.focus');
    expect(preview).not.toContain('querySelector');
    expect(preview).not.toContain('<style>');
    expect(previewCss).not.toContain(':has(');
  });

  it('removes global Invitation Studio recovery imports', async () => {
    const layout = await read('src/app/layout.tsx');

    expect(layout).not.toContain('romantic-clarity-editor-consistency.css');
    expect(layout).not.toContain('invitation-mobile-recovery.css');
  });
});
