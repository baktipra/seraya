import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

const { revalidatePathMock, saveDraftMock } = vi.hoisted(() => ({
  revalidatePathMock: vi.fn(),
  saveDraftMock: vi.fn(),
}));

vi.mock('next/cache', () => ({ revalidatePath: revalidatePathMock }));
vi.mock('../invitation-editor.service', () => ({
  InvitationEditorDraftUnavailableError: class InvitationEditorDraftUnavailableError extends Error {},
  InvitationEditorValidationError: class InvitationEditorValidationError extends Error {
    fieldErrors: Record<string, string>;

    constructor(fieldErrors: Record<string, string>) {
      super('invalid');
      this.fieldErrors = fieldErrors;
    }
  },
  saveInvitationEditorDraftForCurrentUser: saveDraftMock,
}));

import { initialInvitationEditorActionState } from '../invitation-editor.action-state';
import { saveInvitationEditorAction } from '../invitation-editor.actions';
import {
  createValidInvitationEditorFormData,
  createValidInvitationEditorPayloadFormData,
  invitationEditorTestProjectId as projectId,
} from './invitation-editor.test-helpers';

describe('SRY-016 invitation editor server action', () => {
  beforeEach(() => {
    revalidatePathMock.mockReset();
    saveDraftMock.mockReset();
  });

  it('delegates only validated editable input to the owner-scoped service and refreshes private surfaces', async () => {
    saveDraftMock.mockResolvedValue(undefined);
    const formData = createValidInvitationEditorFormData();

    await expect(
      saveInvitationEditorAction(initialInvitationEditorActionState, formData),
    ).resolves.toEqual({ message: 'Perubahan undangan sudah disimpan.', status: 'success' });

    expect(saveDraftMock).toHaveBeenCalledTimes(1);
    const submitted = saveDraftMock.mock.calls[0]?.[0];
    expect(submitted.projectId).toBe(projectId);
    expect(submitted.content.gallery).toEqual({ enabled: false });
    expect(submitted.content.gallery.imageIds).toBeUndefined();
    expect(submitted.content.meta).toBeUndefined();
    expect(submitted.content.templateKey).toBe('roselle');
    expect(revalidatePathMock).toHaveBeenCalledWith(`/dashboard/${projectId}`);
    expect(revalidatePathMock).toHaveBeenCalledWith(`/dashboard/${projectId}/invitation`);
    expect(revalidatePathMock).toHaveBeenCalledWith(`/dashboard/${projectId}/preview`);
    expect(revalidatePathMock).toHaveBeenCalledTimes(3);
  });

  it('accepts the active-chapter runtime payload without trusting gallery membership or metadata fields', async () => {
    saveDraftMock.mockResolvedValue(undefined);

    await expect(
      saveInvitationEditorAction(
        initialInvitationEditorActionState,
        createValidInvitationEditorPayloadFormData(),
      ),
    ).resolves.toEqual({ message: 'Perubahan undangan sudah disimpan.', status: 'success' });

    const submitted = saveDraftMock.mock.calls[0]?.[0];
    expect(submitted.content.gallery).toEqual({ enabled: false });
    expect(submitted.content.gallery.imageIds).toBeUndefined();
    expect(submitted.content.meta).toBeUndefined();
    expect(submitted.content.eventSchedule.events).toHaveLength(1);
  });

  it('returns safe validation feedback without calling the service for injected form fields', async () => {
    const formData = createValidInvitationEditorFormData();
    formData.set('snapshot', 'forged');

    const result = await saveInvitationEditorAction(initialInvitationEditorActionState, formData);

    expect(result.status).toBe('error');
    expect(result.fieldErrors?.form).toBe('Form undangan tidak valid.');
    expect(saveDraftMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it('returns an owner-safe unavailable state without exposing another project or draft', async () => {
    saveDraftMock.mockRejectedValue(new ProjectAccessDeniedError());

    await expect(
      saveInvitationEditorAction(
        initialInvitationEditorActionState,
        createValidInvitationEditorFormData(),
      ),
    ).resolves.toEqual({ message: 'Undangan ini tidak tersedia untuk diubah.', status: 'error' });
  });
});
