import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

describe('Slice G contextual primary action', () => {
  it('publishes and clears the canonical local dirty state through the React subscription', async () => {
    const contextualActionSource = await readFile(
      path.resolve(
        process.cwd(),
        'src/components/projects/invitation-editor-contextual-actions.ts',
      ),
      'utf8',
    );

    expect(contextualActionSource).toContain('setUnsavedChanges(isDirty)');
    expect(contextualActionSource).toContain('setUnsavedChanges(false)');
    expect(contextualActionSource).toContain(
      'useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)',
    );
  });

  it('mounts the contextual guard for every editor readiness state', async () => {
    const previewSource = await readFile(
      path.resolve(process.cwd(), 'src/components/projects/invitation-editor-live-preview.tsx'),
      'utf8',
    );
    const authorityCss = await readFile(
      path.resolve(process.cwd(), 'src/components/projects/invitation-editor-authority.module.css'),
      'utf8',
    );

    expect(previewSource).toContain('useInvitationEditorContextualSaveAction(isDirty)');
    expect(authorityCss).toContain(
      'Slice G: Save is primary only while there are local changes to commit.',
    );
    expect(authorityCss).toContain("button[data-editor-contextual-save-action='clean']");
  });
});
