import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

describe('Slice G contextual primary action', () => {
  it('publishes and clears canonical local dirty state through the React subscription', async () => {
    const source = await readFile(
      path.resolve(
        process.cwd(),
        'src/components/projects/invitation-editor-contextual-actions.ts',
      ),
      'utf8',
    );

    expect(source).toContain('setUnsavedChanges(isDirty)');
    expect(source).toContain('setUnsavedChanges(false)');
    expect(source).toContain('useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)');
  });

  it('mounts the contextual guard and consumes it in publication controls', async () => {
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
    expect(publication).toContain('useInvitationEditorUnsavedChanges()');
    expect(publication).toContain('!hasUnsavedEditorChanges');
    expect(publication).toContain('Simpan perubahan sebelum menerbitkan versi ini.');
  });
});
