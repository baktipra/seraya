import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

describe('Slice F editor save-preview-publish authority', () => {
  it('blocks publication while the editor is showing local unsaved changes', async () => {
    const source = await readFile(
      path.resolve(process.cwd(), 'src/components/projects/publish-invitation-controls.tsx'),
      'utf8',
    );

    expect(source).toContain('useInvitationEditorAuthority');
    expect(source).toContain('[data-testid="invitation-editor-save-status"]');
    expect(source).toContain('new MutationObserver(syncAuthorityState)');
    expect(source).toContain('!editorAuthority.hasUnsavedEditorChanges');
    expect(source).toContain('Simpan perubahan sebelum menerbitkan versi ini.');
    expect(source).toContain('createPortal(controls, editorAuthority.actionTarget)');
    expect(source).toContain('Status bagian mengikuti draf tersimpan.');
    expect(source).toContain("return presentation === 'readiness'");
    expect(source).not.toContain(
      'setBridge({ ...initialEditorAuthorityBridge, isResolved: true });',
    );
  });

  it('keeps one saved-preview authority and hides it while local changes are dirty', async () => {
    const source = await readFile(
      path.resolve(process.cwd(), 'src/components/projects/invitation-editor-authority.module.css'),
      'utf8',
    );

    expect(source).toContain(
      'Slice F: the sticky dock is the single authority for save, preview, and publish.',
    );
    expect(source).toContain("section[aria-label='Ringkasan undangan']");
    expect(source).toContain("[data-editor-authority-state='dirty']");
    expect(source).toContain(':not([data-editor-authority-state])');
    expect(source).toContain("content: 'Status bagian mengikuti draf tersimpan.';");
    expect(source).toContain("a[href$='/preview']");
    expect(source).toContain('[data-editor-publication-authority]');
  });
});
