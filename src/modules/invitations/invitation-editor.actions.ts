'use server';

import { revalidatePath } from 'next/cache';

import type { InvitationEditorActionState } from './invitation-editor.action-state';
import {
  getInvitationEditorFieldErrors,
  parseInvitationEditorFormData,
} from './invitation-editor.schema';
import {
  InvitationEditorDraftUnavailableError,
  InvitationEditorValidationError,
  saveInvitationEditorDraftForCurrentUser,
} from './invitation-editor.service';
import { InvitationDraftRepositoryError } from './invitation-draft.repository';
import { AuthenticationRequiredError } from '@/modules/auth/current-user';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

function revalidatePrivateInvitationEditorSurfaces(projectId: string) {
  revalidatePath(`/dashboard/${projectId}`);
  revalidatePath(`/dashboard/${projectId}/invitation`);
  revalidatePath(`/dashboard/${projectId}/preview`);
}

/** Server Action module intentionally exports async functions only. */
export async function saveInvitationEditorAction(
  _previousState: InvitationEditorActionState,
  formData: FormData,
): Promise<InvitationEditorActionState> {
  const parsed = parseInvitationEditorFormData(formData);

  if (!parsed.success) {
    return {
      fieldErrors: getInvitationEditorFieldErrors(parsed.error),
      message: 'Periksa kembali bagian undangan yang perlu diperbaiki.',
      status: 'error',
    };
  }

  try {
    await saveInvitationEditorDraftForCurrentUser(parsed.data);
  } catch (error) {
    if (error instanceof InvitationEditorValidationError) {
      return {
        fieldErrors: error.fieldErrors,
        message: 'Periksa kembali bagian undangan yang perlu diperbaiki.',
        status: 'error',
      };
    }

    if (
      error instanceof AuthenticationRequiredError ||
      error instanceof ProjectAccessDeniedError ||
      error instanceof InvitationEditorDraftUnavailableError
    ) {
      return { message: 'Undangan ini tidak tersedia untuk diubah.', status: 'error' };
    }

    if (error instanceof InvitationDraftRepositoryError) {
      console.error('Seraya invitation editor repository failure.', { errorName: error.name });
    } else {
      console.error('Seraya invitation editor save failed.', {
        errorName: error instanceof Error ? error.name : 'UnknownError',
      });
    }

    return {
      message: 'Perubahan undangan belum bisa disimpan. Coba lagi beberapa saat lagi.',
      status: 'error',
    };
  }

  revalidatePrivateInvitationEditorSurfaces(parsed.data.projectId);
  return { message: 'Perubahan undangan sudah disimpan.', status: 'success' };
}
