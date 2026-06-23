'use server';

import { revalidatePath } from 'next/cache';

import type { GuestLinkActionState } from './guest-link.action-state';
import { parsePersonalGuestLinkActionFormData } from './guest-link.schema';
import {
  createOrReplacePersonalGuestLinkForCurrentUser,
  GuestAccessDeniedError,
  isGuestLinkFailure,
  revokePersonalGuestLinkForCurrentUser,
} from './guest-link.service';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

function revalidatePrivateGuestSurfaces(projectId: string) {
  revalidatePath(`/dashboard/${projectId}`);
  revalidatePath(`/dashboard/${projectId}/guests`);
}

/** Server Action module intentionally exports async functions only. */
export async function createOrReplacePersonalGuestLinkAction(
  _previousState: GuestLinkActionState,
  formData: FormData,
): Promise<GuestLinkActionState> {
  const parsed = parsePersonalGuestLinkActionFormData(formData);

  if (!parsed.success) {
    return { message: 'Tautan pribadi tidak dapat dibuat untuk tamu ini.', status: 'error' };
  }

  try {
    const result = await createOrReplacePersonalGuestLinkForCurrentUser(parsed.data);
    revalidatePrivateGuestSurfaces(parsed.data.projectId);

    return {
      message: 'Tautan pribadi siap untuk disalin.',
      personalUrl: result.personalUrl,
      status: 'success',
    };
  } catch (error) {
    if (error instanceof ProjectAccessDeniedError || error instanceof GuestAccessDeniedError) {
      return { message: 'Tautan pribadi tidak tersedia untuk tamu ini.', status: 'error' };
    }

    if (isGuestLinkFailure(error)) {
      console.error('Seraya personal guest-link mutation failed.', {
        errorName: error.name,
      });
    } else {
      console.error('Seraya personal guest-link action failed.', {
        errorName: error instanceof Error ? error.name : 'UnknownError',
      });
    }

    return {
      message: 'Tautan pribadi belum bisa dibuat. Coba lagi beberapa saat lagi.',
      status: 'error',
    };
  }
}

export async function revokePersonalGuestLinkAction(
  _previousState: GuestLinkActionState,
  formData: FormData,
): Promise<GuestLinkActionState> {
  const parsed = parsePersonalGuestLinkActionFormData(formData);

  if (!parsed.success) {
    return { message: 'Tautan pribadi tidak dapat dinonaktifkan.', status: 'error' };
  }

  try {
    await revokePersonalGuestLinkForCurrentUser(parsed.data);
    revalidatePrivateGuestSurfaces(parsed.data.projectId);
    return { message: 'Tautan pribadi sudah dinonaktifkan.', status: 'success' };
  } catch (error) {
    if (error instanceof ProjectAccessDeniedError || error instanceof GuestAccessDeniedError) {
      return { message: 'Tautan pribadi tidak tersedia untuk tamu ini.', status: 'error' };
    }

    if (isGuestLinkFailure(error)) {
      console.error('Seraya personal guest-link revocation failed.', {
        errorName: error.name,
      });
    } else {
      console.error('Seraya personal guest-link revocation action failed.', {
        errorName: error instanceof Error ? error.name : 'UnknownError',
      });
    }

    return {
      message: 'Tautan pribadi belum bisa dinonaktifkan. Coba lagi beberapa saat lagi.',
      status: 'error',
    };
  }
}
