'use server';

import { revalidatePath } from 'next/cache';

import type { GuestActionState } from './guest.action-state';
import {
  getGuestFieldErrors,
  parseCreateGuestFormData,
  parseRemoveGuestFormData,
  parseUpdateGuestFormData,
} from './guest.schema';
import { GuestAccessDeniedError } from './guest.policy';
import {
  createGuestForCurrentUser,
  GuestAttendanceCountConflictError,
  isGuestRepositoryFailure,
  softRemoveGuestForCurrentUser,
  updateGuestForCurrentUser,
} from './guest.service';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

function revalidateGuestSurfaces(projectId: string) {
  revalidatePath(`/dashboard/${projectId}`);
  revalidatePath(`/dashboard/${projectId}/guests`);
  revalidatePath(`/dashboard/${projectId}/rsvp`);
}

/** Server Action module intentionally exports async functions only. */
export async function createGuestAction(
  _previousState: GuestActionState,
  formData: FormData,
): Promise<GuestActionState> {
  const parsed = parseCreateGuestFormData(formData);

  if (!parsed.success) {
    return {
      fieldErrors: getGuestFieldErrors(parsed.error),
      message: 'Periksa lagi detail tamu yang perlu dilengkapi.',
      status: 'error',
    };
  }

  try {
    await createGuestForCurrentUser({
      guest: {
        displayName: parsed.data.displayName,
        groupLabel: parsed.data.groupLabel,
        partySize: parsed.data.partySize,
        whatsappPhoneE164: parsed.data.whatsappPhoneE164 ?? null,
      },
      projectId: parsed.data.projectId,
    });
  } catch (error) {
    if (error instanceof ProjectAccessDeniedError || error instanceof GuestAccessDeniedError) {
      return { message: 'Tamu tidak dapat ditambahkan ke undangan ini.', status: 'error' };
    }

    if (isGuestRepositoryFailure(error)) {
      console.error('Seraya guest creation repository failure.', {
        errorName: error.name,
      });
    } else {
      console.error('Seraya guest creation failed.', {
        errorName: error instanceof Error ? error.name : 'UnknownError',
      });
    }

    return { message: 'Tamu belum bisa disimpan. Coba lagi beberapa saat lagi.', status: 'error' };
  }

  revalidateGuestSurfaces(parsed.data.projectId);
  return { message: 'Tamu sudah ditambahkan.', status: 'success' };
}

export async function updateGuestAction(
  _previousState: GuestActionState,
  formData: FormData,
): Promise<GuestActionState> {
  const parsed = parseUpdateGuestFormData(formData);

  if (!parsed.success) {
    return {
      fieldErrors: getGuestFieldErrors(parsed.error),
      message: 'Periksa lagi detail tamu yang perlu dilengkapi.',
      status: 'error',
    };
  }

  try {
    await updateGuestForCurrentUser({
      guest: {
        displayName: parsed.data.displayName,
        groupLabel: parsed.data.groupLabel,
        partySize: parsed.data.partySize,
        whatsappPhoneE164: parsed.data.whatsappPhoneE164 ?? null,
      },
      guestId: parsed.data.guestId,
      projectId: parsed.data.projectId,
    });
  } catch (error) {
    if (error instanceof ProjectAccessDeniedError || error instanceof GuestAccessDeniedError) {
      return { message: 'Tamu tidak dapat diperbarui untuk undangan ini.', status: 'error' };
    }

    if (error instanceof GuestAttendanceCountConflictError) {
      return {
        fieldErrors: {
          partySize:
            'Jumlah undangan tidak boleh lebih kecil dari jumlah orang yang sudah dikonfirmasi hadir.',
        },
        message: 'Periksa jumlah undangan untuk tamu ini.',
        status: 'error',
      };
    }

    console.error('Seraya guest update failed.', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
    return {
      message: 'Tamu belum bisa diperbarui. Coba lagi beberapa saat lagi.',
      status: 'error',
    };
  }

  revalidateGuestSurfaces(parsed.data.projectId);
  return { message: 'Perubahan tamu sudah disimpan.', status: 'success' };
}

export async function removeGuestAction(
  _previousState: GuestActionState,
  formData: FormData,
): Promise<GuestActionState> {
  const parsed = parseRemoveGuestFormData(formData);

  if (!parsed.success) {
    return { message: 'Tamu tidak dapat dihapus dari undangan ini.', status: 'error' };
  }

  try {
    await softRemoveGuestForCurrentUser({
      guestId: parsed.data.guestId,
      projectId: parsed.data.projectId,
    });
  } catch (error) {
    if (error instanceof ProjectAccessDeniedError || error instanceof GuestAccessDeniedError) {
      return { message: 'Tamu tidak dapat dihapus dari undangan ini.', status: 'error' };
    }

    console.error('Seraya guest removal failed.', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
    return { message: 'Tamu belum bisa dihapus. Coba lagi beberapa saat lagi.', status: 'error' };
  }

  revalidateGuestSurfaces(parsed.data.projectId);
  return { message: 'Tamu dihapus dari daftar.', status: 'success' };
}
