'use server';

import { revalidatePath } from 'next/cache';

import type {
  DeliveryBatchActionState,
  DeliveryLinkActionState,
  DeliveryWhatsAppClipboardActionState,
} from './delivery.action-state';
import {
  parseDeliveryBatchBoundInput,
  parseDeliveryBatchConfirmationFormData,
  parseDeliveryCopyNumbersFormData,
  parseDeliveryLinkBoundInput,
  parseDeliveryLinkConfirmationFormData,
  parseDeliveryReaccessFormData,
  type DeliveryBatchBoundInput,
  type DeliveryLinkBoundInput,
} from './delivery.schema';
import {
  DeliveryActiveLinkConfirmationRequiredError,
  DeliveryPublicationRequiredError,
  GuestAccessDeniedError,
  getSelectedDeliveryWhatsAppNumbersForCurrentUser,
  isDeliveryFailure,
  prepareMissingPersonalGuestLinksForDeliveryForCurrentUser,
  preparePersonalGuestLinkForDeliveryForCurrentUser,
  reaccessPersonalGuestLinkForDeliveryForCurrentUser,
} from './delivery.service';
import {
  GuestLinkLegacyUpgradeRequiredError,
  GuestLinkUnavailableError,
} from '@/modules/guest-links/guest-link.service';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

function revalidatePrivateDeliverySurfaces(projectId: string) {
  revalidatePath(`/dashboard/${projectId}`);
  revalidatePath(`/dashboard/${projectId}/delivery`);
  revalidatePath(`/dashboard/${projectId}/guests`);
}

/** The guest/project target is bound by a verified dashboard server renderer. */
export async function preparePersonalGuestLinkForDeliveryAction(
  boundInput: DeliveryLinkBoundInput,
  _previousState: DeliveryLinkActionState,
  formData: FormData,
): Promise<DeliveryLinkActionState> {
  const [bound, confirmation] = [
    parseDeliveryLinkBoundInput(boundInput),
    parseDeliveryLinkConfirmationFormData(formData),
  ];
  if (!bound.success || !confirmation.success) {
    return { message: 'Tautan pribadi tidak dapat disiapkan untuk tamu ini.', status: 'error' };
  }

  try {
    const result = await preparePersonalGuestLinkForDeliveryForCurrentUser({
      confirmActiveReplacement: confirmation.data.confirmActiveReplacement === 'true',
      guestId: bound.data.guestId,
      projectId: bound.data.projectId,
    });
    revalidatePrivateDeliverySurfaces(bound.data.projectId);
    return {
      message: 'Tautan pribadi siap untuk disalin.',
      personalUrl: result.personalUrl,
      ...(result.recipientWhatsAppPhoneE164
        ? { recipientWhatsAppPhoneE164: result.recipientWhatsAppPhoneE164 }
        : {}),
      status: 'success',
    };
  } catch (error) {
    if (error instanceof DeliveryPublicationRequiredError) {
      return {
        message: 'Publikasikan undangan terlebih dahulu sebelum membagikan tautan pribadi.',
        status: 'error',
      };
    }
    if (error instanceof DeliveryActiveLinkConfirmationRequiredError) {
      return {
        message: 'Konfirmasikan penggantian tautan aktif sebelum membuat tautan baru.',
        status: 'error',
      };
    }
    if (error instanceof ProjectAccessDeniedError || error instanceof GuestAccessDeniedError) {
      return { message: 'Tautan pribadi tidak tersedia untuk tamu ini.', status: 'error' };
    }
    if (isDeliveryFailure(error))
      console.error('Seraya delivery personal-link preparation failed.', { errorName: error.name });
    else
      console.error('Seraya delivery action failed.', {
        errorName: error instanceof Error ? error.name : 'UnknownError',
      });
    return {
      message: 'Tautan pribadi belum bisa disiapkan. Coba lagi beberapa saat lagi.',
      status: 'error',
    };
  }
}

/** Explicit one-row owner re-access. URL is returned only in this authorized action result. */
export async function reaccessPersonalGuestLinkForDeliveryAction(
  boundInput: DeliveryLinkBoundInput,
  _previousState: DeliveryLinkActionState,
  formData: FormData,
): Promise<DeliveryLinkActionState> {
  const [bound, operation] = [
    parseDeliveryLinkBoundInput(boundInput),
    parseDeliveryReaccessFormData(formData),
  ];
  if (!bound.success || !operation.success) {
    return { message: 'Tautan pribadi tidak tersedia untuk tindakan ini.', status: 'error' };
  }

  try {
    const result = await reaccessPersonalGuestLinkForDeliveryForCurrentUser(bound.data);
    return {
      message: operation.data.operation,
      personalUrl: result.personalUrl,
      ...(result.recipientWhatsAppPhoneE164
        ? { recipientWhatsAppPhoneE164: result.recipientWhatsAppPhoneE164 }
        : {}),
      status: 'success',
    };
  } catch (error) {
    if (error instanceof GuestLinkLegacyUpgradeRequiredError) {
      return {
        message: 'Tautan lama belum dapat disalin. Perbarui tautan agar dapat dikelola.',
        status: 'error',
      };
    }
    if (
      error instanceof DeliveryPublicationRequiredError ||
      error instanceof GuestLinkUnavailableError ||
      error instanceof ProjectAccessDeniedError ||
      error instanceof GuestAccessDeniedError
    ) {
      return { message: 'Tautan pribadi tidak tersedia untuk tamu ini.', status: 'error' };
    }
    console.error('Seraya delivery personal-link re-access failed.', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
    return {
      message: 'Tautan pribadi belum bisa diakses. Coba lagi beberapa saat lagi.',
      status: 'error',
    };
  }
}

/** Batch preparation exposes aggregate readiness only. Raw capability material remains unavailable. */
export async function prepareMissingPersonalGuestLinksForDeliveryAction(
  boundInput: DeliveryBatchBoundInput,
  _previousState: DeliveryBatchActionState,
  formData: FormData,
): Promise<DeliveryBatchActionState> {
  const [bound, confirmation] = [
    parseDeliveryBatchBoundInput(boundInput),
    parseDeliveryBatchConfirmationFormData(formData),
  ];
  if (!bound.success || !confirmation.success) {
    return {
      message: 'Undangan Pribadi belum dapat disiapkan. Konfirmasi kembali sebelum melanjutkan.',
      status: 'error',
    };
  }

  try {
    const result = await prepareMissingPersonalGuestLinksForDeliveryForCurrentUser({
      guestIds: confirmation.data.selectedGuestIds,
      projectId: bound.data.projectId,
    });
    revalidatePrivateDeliverySurfaces(bound.data.projectId);
    const status = result.failedCount > 0 ? 'partial' : 'success';
    const message =
      result.failedCount > 0
        ? 'Sebagian Undangan Pribadi belum dapat disiapkan. Coba lagi untuk melanjutkan yang tersisa.'
        : result.createdCount > 0
          ? 'Undangan Pribadi sudah disiapkan. Lanjutkan pembagian manual per tamu di Delivery Center.'
          : 'Tidak ada Undangan Pribadi baru yang perlu disiapkan.';
    return { ...result, message, status };
  } catch (error) {
    if (error instanceof DeliveryPublicationRequiredError) {
      return {
        message: 'Publikasikan undangan terlebih dahulu sebelum menyiapkan Undangan Pribadi.',
        status: 'error',
      };
    }
    if (error instanceof ProjectAccessDeniedError || error instanceof GuestAccessDeniedError) {
      return { message: 'Undangan Pribadi tidak tersedia untuk project ini.', status: 'error' };
    }
    if (isDeliveryFailure(error))
      console.error('Seraya delivery batch preparation failed.', { errorName: error.name });
    else
      console.error('Seraya delivery batch action failed.', {
        errorName: error instanceof Error ? error.name : 'UnknownError',
      });
    return {
      message: 'Undangan Pribadi belum bisa disiapkan. Coba lagi beberapa saat lagi.',
      status: 'error',
    };
  }
}

/** Owner-only clipboard response. It neither opens WhatsApp nor creates any delivery record. */
export async function copySelectedDeliveryWhatsAppNumbersAction(
  boundInput: DeliveryBatchBoundInput,
  _previousState: DeliveryWhatsAppClipboardActionState,
  formData: FormData,
): Promise<DeliveryWhatsAppClipboardActionState> {
  const [bound, selection] = [
    parseDeliveryBatchBoundInput(boundInput),
    parseDeliveryCopyNumbersFormData(formData),
  ];
  if (!bound.success || !selection.success) {
    return {
      message: 'Pilih setidaknya satu tamu dengan Nomor WhatsApp tersedia.',
      status: 'error',
    };
  }
  try {
    const numbers = await getSelectedDeliveryWhatsAppNumbersForCurrentUser({
      guestIds: selection.data.selectedGuestIds,
      projectId: bound.data.projectId,
    });
    if (numbers.length === 0) {
      return { message: 'Tidak ada Nomor WhatsApp valid pada tamu terpilih.', status: 'error' };
    }
    return {
      message: `${numbers.length} Nomor WhatsApp siap disalin.`,
      numbersText: numbers.join('\n'),
      status: 'success',
    };
  } catch (error) {
    if (error instanceof ProjectAccessDeniedError)
      return { message: 'Nomor WhatsApp tidak tersedia untuk project ini.', status: 'error' };
    console.error('Seraya delivery WhatsApp clipboard action failed.', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
    return { message: 'Nomor WhatsApp belum bisa disiapkan untuk disalin.', status: 'error' };
  }
}
