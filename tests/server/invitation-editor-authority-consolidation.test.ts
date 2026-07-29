import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

describe('Slice F editor save-preview-publish authority', () => {
  it('blocks publication from canonical React dirty state without DOM discovery', async () => {
    const source = await readFile(
      path.resolve(process.cwd(), 'src/components/projects/publish-invitation-controls.tsx'),
      'utf8',
    );

    expect(source).toContain('useInvitationEditorUnsavedChanges');
    expect(source).toContain(
      'hasActiveDraft && publishEligibility.allowed && !hasUnsavedEditorChanges && !isPending',
    );
    expect(source).toContain('Simpan perubahan sebelum menerbitkan versi ini.');
    expect(source).toContain('data-editor-publication-authority');
    expect(source).not.toContain('MutationObserver');
    expect(source).not.toContain('createPortal');
  });

  it('keeps one saved-preview and publication authority in explicit JSX', async () => {
    const [preview, publication] = await Promise.all([
      readFile(
        path.resolve(process.cwd(), 'src/components/projects/invitation-editor-live-preview.tsx'),
        'utf8',
      ),
      readFile(
        path.resolve(process.cwd(), 'src/components/projects/publish-invitation-controls.tsx'),
        'utf8',
      ),
    ]);

    expect(preview).toContain('useInvitationEditorContextualSaveAction(isDirty)');
    expect(preview).toContain(
      "const status = isDirty ? 'Perubahan lokal · belum disimpan' : 'Draf tersimpan';",
    );
    expect(preview).toContain("<Badge variant={isDirty ? 'warning' : 'brand'}>{status}</Badge>");
    expect(publication).toContain("presentation === 'readiness'");
    expect(publication).toContain('data-editor-publication-authority');
    expect(publication).toContain('href={`/dashboard/${projectId}/billing`}');
  });
});
