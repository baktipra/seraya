'use server';

import type { DeliveryLinkActionState } from './delivery.action-state';
import { reaccessPersonalGuestLinkForDeliveryAction } from './delivery.actions';
import {
  GuestFollowUpHandoffNotEligibleError,
  GuestFollowUpPublicationRequiredError,
  prepareGuestFollowUpHandoffForCurrentUser,
} from '@/modules/follow-up/follow-up.service';

type BoundInput = { guestId: string; projectId: string };

function getRecipientFromComposeUrl(value: string) {
  try {
    const digits = new URL(value).pathname.replace(/^\//u, '');
    return digits ? `+${digits}` : null;
  } catch {
    return null;
  }
}

/**
 * Copy/Open remain ordinary capability re-access. The first WhatsApp action
 * records truthful `handoff_prepared`; later actions reopen WhatsApp without
 * fabricating another initial-distribution event.
 */
export async function reaccessOrPrepareCanonicalInitialHandoffAction(
  boundInput: BoundInput,
  previousState: DeliveryLinkActionState,
  formData: FormData,
): Promise<DeliveryLinkActionState> {
  const operation = formData.get('operation');

  if (operation !== 'share') {
    return reaccessPersonalGuestLinkForDeliveryAction(boundInput, previousState, formData);
  }

  try {
    const result = await prepareGuestFollowUpHandoffForCurrentUser({
      guestId: boundInput.guestId,
      messageKind: 'initial_invitation',
      projectId: boundInput.projectId,
      sourceSurface: 'delivery_center',
    });

    return {
      message: 'share',
      personalUrl: result.personalUrl,
      recipientWhatsAppPhoneE164: getRecipientFromComposeUrl(result.whatsappComposeUrl),
      status: 'success',
      whatsappComposeUrl: result.whatsappComposeUrl,
    };
  } catch (error) {
    if (error instanceof GuestFollowUpHandoffNotEligibleError) {
      return reaccessPersonalGuestLinkForDeliveryAction(boundInput, previousState, formData);
    }

    if (error instanceof GuestFollowUpPublicationRequiredError) {
      return {
        message: 'Publikasikan undangan terlebih dahulu sebelum membagikan undangan awal.',
        status: 'error',
      };
    }

    return {
      message: 'Handoff WhatsApp belum dapat disiapkan. Periksa data tamu lalu coba lagi.',
      status: 'error',
    };
  }
}
