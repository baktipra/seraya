import { describe, expect, it } from 'vitest';

import {
  getInvitationStudioSavePresentation,
  shouldConfirmInvitationStudioNavigation,
} from '../../src/components/projects/invitation-studio-provider';

describe('Invitation Studio Slice B save authority', () => {
  it('projects one truthful save state for each lifecycle phase', () => {
    expect(
      getInvitationStudioSavePresentation({
        actionStatus: 'idle',
        hasSaved: false,
        isDirty: false,
        isPending: false,
      }),
    ).toMatchObject({ label: 'Belum ada perubahan', state: 'clean', tone: 'neutral' });

    expect(
      getInvitationStudioSavePresentation({
        actionStatus: 'idle',
        hasSaved: false,
        isDirty: true,
        isPending: false,
      }),
    ).toMatchObject({ label: 'Belum tersimpan', state: 'dirty', tone: 'warning' });

    expect(
      getInvitationStudioSavePresentation({
        actionStatus: 'idle',
        hasSaved: false,
        isDirty: true,
        isPending: true,
      }),
    ).toMatchObject({ label: 'Menyimpan perubahan…', state: 'saving' });

    expect(
      getInvitationStudioSavePresentation({
        actionStatus: 'error',
        hasSaved: false,
        isDirty: true,
        isPending: false,
      }),
    ).toMatchObject({
      actionLabel: 'Coba simpan lagi',
      label: 'Gagal menyimpan',
      state: 'error',
      tone: 'error',
    });

    expect(
      getInvitationStudioSavePresentation({
        actionStatus: 'success',
        hasSaved: true,
        isDirty: false,
        isPending: false,
      }),
    ).toMatchObject({
      label: 'Semua perubahan tersimpan',
      state: 'saved',
      tone: 'success',
    });
  });

  it('only suppresses confirmation for a same-document hash handoff', () => {
    const current = 'https://seraya.test/dashboard/project/invitation?mode=content';

    expect(
      shouldConfirmInvitationStudioNavigation(
        current,
        '/dashboard/project/invitation?mode=content#bagian-acara',
      ),
    ).toBe(false);
    expect(
      shouldConfirmInvitationStudioNavigation(current, '/dashboard/project/invitation?mode=design'),
    ).toBe(true);
    expect(shouldConfirmInvitationStudioNavigation(current, '/dashboard/project/guests')).toBe(
      true,
    );
  });
});
