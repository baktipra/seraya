import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { getInvitationEditorContextualSaveActionState } from '../../src/components/projects/invitation-editor-contextual-actions';

describe('Slice G contextual primary action', () => {
  it('keeps Save active only when local changes can be committed', () => {
    expect(
      getInvitationEditorContextualSaveActionState({
        isDirty: false,
        statusLabel: 'Belum ada perubahan',
      }),
    ).toBe('clean');
    expect(
      getInvitationEditorContextualSaveActionState({
        isDirty: true,
        statusLabel: 'Belum disimpan',
      }),
    ).toBe('dirty');
    expect(
      getInvitationEditorContextualSaveActionState({
        isDirty: true,
        statusLabel: 'Menyimpan perubahan…',
      }),
    ).toBe('saving');
    expect(
      getInvitationEditorContextualSaveActionState({
        isDirty: false,
        statusLabel: 'Tersimpan',
      }),
    ).toBe('clean');
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
