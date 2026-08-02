'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';

import type { GuestLinkActionState } from './guest-link.action-state';
import {
  parsePersonalGuestLinkMutationFormData,
  parsePersonalGuestLinkReaccessFormData,
  parsePersonalGuestLinkRevocationFormData,
} from './guest-link.schema';
import {
  createOrReplacePersonalGuestLinkForCurrentUser,
  GuestAccessDeniedError,
  GuestLinkActiveReplacementConfirmationRequiredError,
  GuestLinkCommandNotAllowedError,
  GuestLinkLegacyUpgradeRequiredError,
  GuestLinkLifecycleChangedError,
  GuestLinkRevocationConfirmationRequiredError,
  GuestLinkUnavailableError,
  isGuestLinkFailure,
  reaccessPersonalGuestLinkForCurrentUser,
  revokePersonalGuestLinkForCurrentUser,
} from './guest-link.service';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

function revalidatePrivateGuestSurfaces(projectId: string) {
  revalidatePath(`/dashboard/${projectId}`);
  revalidatePath(`/dashboard/${projectId}/delivery`);
  revalidatePath(`/dashboard/${projectId}/follow-up`);
  revalidatePath(`/dashboard/${projectId}/guests`);
}

function createSuccessfulLinkState(input: {
  message: string;
  personalUrl: string;
  recipientWhatsAppPhoneE164: string | null;
}): GuestLinkActionState {
  return {
    message: input.message,
    personalUrl: input.personalUrl,
    ...(input.recipientWhatsAppPhoneE164
      ? { recipientWhatsAppPhoneE164: input.recipientWhatsAppPhoneE164 }
      : {}),
    resultKey: randomUUID(),
    status: 'success',
  };
}

/** Server Action module intentionally exports async functions only. */
export async function createOrReplacePersonalGuestLinkAction(
  _previousState: GuestLinkActionState,
  formData: FormData,
): Promise<GuestLinkActionState> {
  const parsed = parsePersonalGuestLinkMutationFormData(formData);

  if (!parsed.success) {
    return {
      message: 'Perintah tautan tidak valid. Muat ulang halaman lalu coba lagi.',
      status: 'error',
    };
  }

  try {
    const result = await createOrReplacePersonalGuestLinkForCurrentUser({
      confirmActiveReplacement: parsed.data.confirmActiveReplacement === 'true',
      expectedLifecycleState: parsed.data.expectedLifecycleState,
      guestId: parsed.data.guestId,
      projectId: parsed.data.projectId,
    });
    revalidatePrivateGuestSurfaces(parsed.data.projectId);

    return createSuccessfulLinkState({
      message:
        result.previousLifecycleState === 'not_created'
          ? 'Tautan pribadi berhasil dibuat.'
          : 'Tautan pribadi baru berhasil disiapkan.',
      personalUrl: result.personalUrl,
      recipientWhatsAppPhoneE164: result.recipientWhatsAppPhoneE164,
    });
  } catch (error) {
    if (error instanceof GuestLinkLifecycleChangedError) {
      return {
        message: 'Status tautan sudah berubah. Muat ulang halaman sebelum melanjutkan.',
        status: 'error',
      };
    }

    if (error instanceof GuestLinkActiveReplacementConfirmationRequiredError) {
      return {
        message: 'Konfirmasikan penggantian URL aktif sebelum membuat tautan baru.',
        status: 'error',
      };
    }

    if (error instanceof GuestLinkCommandNotAllowedError) {
      return {
        message: 'Perintah ini tidak lagi sesuai dengan status tautan terbaru.',
        status: 'error',
      };
    }

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

/** Explicit owner re-access. Raw URL exists only in this authorized action result. */
export async function reaccessPersonalGuestLinkAction(
  _previousState: GuestLinkActionState,
  formData: FormData,
): Promise<GuestLinkActionState> {
  const parsed = parsePersonalGuestLinkReaccessFormData(formData);

  if (!parsed.success) {
    return {
      message: 'Perintah akses tautan tidak valid. Muat ulang halaman lalu coba lagi.',
      status: 'error',
    };
  }

  try {
    const result = await reaccessPersonalGuestLinkForCurrentUser(parsed.data);
    return createSuccessfulLinkState({
      message: 'Tautan aktif berhasil ditampilkan kembali.',
      personalUrl: result.personalUrl,
      recipientWhatsAppPhoneE164: result.recipientWhatsAppPhoneE164,
    });
  } catch (error) {
    if (error instanceof GuestLinkLifecycleChangedError) {
      return {
        message: 'Status tautan sudah berubah. Muat ulang halaman sebelum melanjutkan.',
        status: 'error',
      };
    }

    if (error instanceof GuestLinkLegacyUpgradeRequiredError) {
      return {
        message: 'URL lama tidak dapat ditampilkan kembali. Perbarui tautan untuk membuat URL baru.',
        status: 'error',
      };
    }

    if (
      error instanceof GuestLinkCommandNotAllowedError ||
      error instanceof GuestLinkUnavailableError ||
      error instanceof ProjectAccessDeniedError ||
      error instanceof GuestAccessDeniedError
    ) {
      return { message: 'Tautan aktif tidak tersedia untuk tamu ini.', status: 'error' };
    }

    if (isGuestLinkFailure(error)) {
      console.error('Seraya personal guest-link re-access failed.', {
        errorName: error.name,
      });
    } else {
      console.error('Seraya personal guest-link re-access action failed.', {
        errorName: error instanceof Error ? error.name : 'UnknownError',
      });
    }

    return {
      message: 'Tautan aktif belum bisa ditampilkan. Coba lagi beberapa saat lagi.',
      status: 'error',
    };
  }
}

export async function revokePersonalGuestLinkAction(
  _previousState: GuestLinkActionState,
  formData: FormData,
): Promise<GuestLinkActionState> {
  const parsed = parsePersonalGuestLinkRevocationFormData(formData);

  if (!parsed.success) {
    return {
      message: 'Perintah penonaktifan tidak valid. Muat ulang halaman lalu coba lagi.',
      status: 'error',
    };
  }

  try {
    await revokePersonalGuestLinkForCurrentUser({
      confirmRevocation: parsed.data.confirmRevocation === 'true',
      expectedLifecycleState: parsed.data.expectedLifecycleState,
      guestId: parsed.data.guestId,
      projectId: parsed.data.projectId,
    });
    revalidatePrivateGuestSurfaces(parsed.data.projectId);
    return { message: 'Tautan pribadi sudah dinonaktifkan.', status: 'success' };
  } catch (error) {
    if (error instanceof GuestLinkLifecycleChangedError) {
      return {
        message: 'Status tautan sudah berubah. Muat ulang halaman sebelum melanjutkan.',
        status: 'error',
      };
    }

    if (error instanceof GuestLinkRevocationConfirmationRequiredError) {
      return {
        message: 'Konfirmasikan penonaktifan URL aktif sebelum melanjutkan.',
        status: 'error',
      };
    }

    if (error instanceof GuestLinkCommandNotAllowedError) {
      return {
        message: 'Tautan ini tidak lagi aktif dan tidak perlu dinonaktifkan.',
        status: 'error',
      };
    }

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
