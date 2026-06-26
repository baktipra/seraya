'use server';

import { revalidatePath } from 'next/cache';

import type { DeliveryLinkActionState } from './delivery.action-state';
import {
  parseDeliveryLinkBoundInput,
  parseDeliveryLinkConfirmationFormData,
  type DeliveryLinkBoundInput,
} from './delivery.schema';
import {
  DeliveryActiveLinkConfirmationRequiredError,
  DeliveryPublicationRequiredError,
  GuestAccessDeniedError,
  isDeliveryFailure,
  preparePersonalGuestLinkForDeliveryForCurrentUser,
} from './delivery.service';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

function revalidatePrivateDeliverySurfaces(projectId: string) {
  revalidatePath(`/dashboard/${projectId}`);
  revalidatePath(`/dashboard/${projectId}/delivery`);
  revalidatePath(`/dashboard/${projectId}/guests`);
}

/**
 * The guest/project target is bound by the verified dashboard server renderer.
 * The browser still cannot bypass owner, guest, publication, or confirmation
 * checks inside the delivery service.
 */
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

    if (isDeliveryFailure(error)) {
      console.error('Seraya delivery personal-link preparation failed.', {
        errorName: error.name,
      });
    } else {
      console.error('Seraya delivery action failed.', {
        errorName: error instanceof Error ? error.name : 'UnknownError',
      });
    }

    return {
      message: 'Tautan pribadi belum bisa disiapkan. Coba lagi beberapa saat lagi.',
      status: 'error',
    };
  }
}
