'use server';

import { revalidatePath } from 'next/cache';

import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

import type { GuestbookActionState } from './guestbook.action-state';
import {
  parseModerateGuestbookEntryFormData,
  parseRemoveGuestbookEntryFormData,
} from './guestbook.schema';
import {
  isGuestbookRepositoryFailure,
  setGuestbookEntryFeedHiddenForCurrentUser,
  softRemoveGuestbookEntryForCurrentUser,
} from './guestbook.service';

export async function removeGuestbookEntryAction(
  _previousState: GuestbookActionState,
  formData: FormData,
): Promise<GuestbookActionState> {
  const parsed = parseRemoveGuestbookEntryFormData(formData);
  if (!parsed.success) return { message: 'Ucapan tidak dapat dihapus.', status: 'error' };

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
  revalidatePath(`/dashboard/${parsed.data.projectId}/rsvp`);
  return { message: 'Ucapan dihapus dari daftar.', status: 'success' };
}

export async function moderateGuestbookEntryAction(
  _previousState: GuestbookActionState,
  formData: FormData,
): Promise<GuestbookActionState> {
  const parsed = parseModerateGuestbookEntryFormData(formData);
  if (!parsed.success) return { message: 'Status ucapan tidak dapat diubah.', status: 'error' };

  try {
    await setGuestbookEntryFeedHiddenForCurrentUser(parsed.data);
  } catch (error) {
    if (error instanceof ProjectAccessDeniedError || isGuestbookRepositoryFailure(error)) {
      return { message: 'Status ucapan tidak dapat diubah.', status: 'error' };
    }
    console.error('Seraya guestbook moderation failed.', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
    return { message: 'Status ucapan belum bisa diubah. Coba lagi beberapa saat lagi.', status: 'error' };
  }

  revalidatePath(`/dashboard/${parsed.data.projectId}/guestbook`);
  revalidatePath(`/dashboard/${parsed.data.projectId}/rsvp`);
  return {
    message: parsed.data.hidden
      ? 'Ucapan disembunyikan dari feed tamu.'
      : 'Ucapan ditampilkan kembali di feed tamu.',
    status: 'success',
  };
}
