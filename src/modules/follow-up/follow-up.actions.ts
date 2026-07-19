'use server';

import { revalidatePath } from 'next/cache';

import {
  GuestLinkLegacyUpgradeRequiredError,
  GuestLinkUnavailableError,
  isGuestLinkFailure,
} from '@/modules/guest-links/guest-link.service';
import { GuestAccessDeniedError } from '@/modules/guests/guest.policy';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

import type { GuestFollowUpHandoffActionState } from './follow-up.action-state';
import {
  parseGuestFollowUpHandoffBoundInput,
  parseGuestFollowUpHandoffFormData,
  type GuestFollowUpHandoffBoundInput,
} from './follow-up.schema';
import {
  GuestFollowUpHandoffNotEligibleError,
  GuestFollowUpPublicationRequiredError,
  GuestFollowUpRsvpUnavailableError,
  prepareGuestFollowUpHandoffForCurrentUser,
} from './follow-up.service';

function revalidatePrivateFollowUpSurfaces(projectId: string) {
  revalidatePath(`/dashboard/${projectId}`);
  revalidatePath(`/dashboard/${projectId}/delivery`);
  revalidatePath(`/dashboard/${projectId}/follow-up`);
}

/**
 * Returns temporary handoff material only after the server has appended the
 * truthful `handoff_prepared` event. It does not claim send, delivery, or read.
 */
export async function prepareGuestFollowUpHandoffAction(
  boundInput: GuestFollowUpHandoffBoundInput,
  _previousState: GuestFollowUpHandoffActionState,
  formData: FormData,
): Promise<GuestFollowUpHandoffActionState> {
  const [bound, operation] = [
    parseGuestFollowUpHandoffBoundInput(boundInput),
    parseGuestFollowUpHandoffFormData(formData),
  ];

  if (!bound.success || !operation.success) {
    return {
      message: 'Handoff WhatsApp tidak dapat disiapkan untuk tamu ini.',
      status: 'error',
    };
  }

  try {
    const result = await prepareGuestFollowUpHandoffForCurrentUser({
      guestId: bound.data.guestId,
      messageKind: operation.data.messageKind,
      projectId: bound.data.projectId,
    });
    revalidatePrivateFollowUpSurfaces(bound.data.projectId);

    return {
      ...result,
      message: 'Handoff WhatsApp disiapkan. Buka WhatsApp untuk melanjutkan pengiriman manual.',
      status: 'success',
    };
  } catch (error) {
    if (error instanceof GuestFollowUpPublicationRequiredError) {
      return {
        message: 'Publikasikan undangan terlebih dahulu sebelum menyiapkan tindak lanjut.',
        status: 'error',
      };
    }

    if (error instanceof GuestFollowUpRsvpUnavailableError) {
      return {
        message: 'Konfirmasi kehadiran tidak aktif pada undangan yang dipublikasikan.',
        status: 'error',
      };
    }

    if (error instanceof GuestFollowUpHandoffNotEligibleError) {
      return {
        message: 'Tindak lanjut ini tidak tersedia untuk kondisi tamu saat ini.',
        status: 'error',
      };
    }

    if (
      error instanceof GuestLinkLegacyUpgradeRequiredError ||
      error instanceof GuestLinkUnavailableError
    ) {
      return {
        message: 'Tautan pribadi perlu diperbarui sebelum tindak lanjut dapat disiapkan.',
        status: 'error',
      };
    }

    if (error instanceof ProjectAccessDeniedError || error instanceof GuestAccessDeniedError) {
      return {
        message: 'Tindak lanjut tidak tersedia untuk tamu ini.',
        status: 'error',
      };
    }

    if (isGuestLinkFailure(error)) {
      console.error('Seraya follow-up capability handoff failed.', { errorName: error.name });
    } else {
      console.error('Seraya follow-up handoff action failed.', {
        errorName: error instanceof Error ? error.name : 'UnknownError',
      });
    }

    return {
      message: 'Handoff WhatsApp belum dapat disiapkan. Coba lagi beberapa saat lagi.',
      status: 'error',
    };
  }
}
