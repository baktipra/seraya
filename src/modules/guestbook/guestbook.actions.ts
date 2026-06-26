'use server';

import { revalidatePath } from 'next/cache';

import type { GuestbookActionState } from './guestbook.action-state';
import { parseRemoveGuestbookEntryFormData } from './guestbook.schema';
import {
  isGuestbookRepositoryFailure,
  softRemoveGuestbookEntryForCurrentUser,
} from './guestbook.service';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

/** Owner-only removal action. It independently resolves current user and project ownership. */
export async function removeGuestbookEntryAction(
  _previousState: GuestbookActionState,
  formData: FormData,
): Promise<GuestbookActionState> {
  const parsed = parseRemoveGuestbookEntryFormData(formData);

  if (!parsed.success) {
    return { message: 'Ucapan tidak dapat dihapus.', status: 'error' };
  }

  try {
    await softRemoveGuestbookEntryForCurrentUser(parsed.data);
  } catch (error) {
    if (error instanceof ProjectAccessDeniedError || isGuestbookRepositoryFailure(error)) {
      return { message: 'Ucapan tidak dapat dihapus.', status: 'error' };
    }

    console.error('Seraya guestbook removal failed.', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
    return { message: 'Ucapan belum bisa dihapus. Coba lagi beberapa saat lagi.', status: 'error' };
  }

  revalidatePath(`/dashboard/${parsed.data.projectId}/guestbook`);
  return { message: 'Ucapan dihapus dari daftar.', status: 'success' };
}
