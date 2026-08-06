import { describe, expect, it } from 'vitest';

import { getInvitationStudioDesignTruth } from '../../src/components/projects/invitation-studio-design-mode';
import { invitationContentStudioChapters } from '../../src/components/projects/invitation-editor-workspace';

// Final Slice C gate preserves the Slice A shell and Slice B command authority.
describe('Invitation Studio Slice C Design Mode', () => {
  it('keeps design outside the eight content chapters', () => {
    expect(invitationContentStudioChapters).toHaveLength(8);
    expect(invitationContentStudioChapters.map((chapter) => chapter.key)).not.toContain('style');
    expect(invitationContentStudioChapters[0]?.key).toBe('opening');
  });

  it('communicates saved, local, and failed design truth without inventing persistence', () => {
    expect(getInvitationStudioDesignTruth({ actionStatus: 'idle', isDirty: false })).toMatchObject({
      label: 'Draf tersimpan',
      state: 'saved',
    });
    expect(getInvitationStudioDesignTruth({ actionStatus: 'idle', isDirty: true })).toMatchObject({
      label: 'Perubahan lokal',
      state: 'unsaved',
    });
    expect(getInvitationStudioDesignTruth({ actionStatus: 'error', isDirty: true })).toMatchObject({
      label: 'Gagal menyimpan',
      state: 'error',
    });
  });
});
