'use server';

import { redirect } from 'next/navigation';

import type { StartPaymentCheckoutActionState } from './payment.action-state';
import { PaymentConfigurationError } from './payment.config';
import {
  PaymentAccessDeniedError,
  PaymentCheckoutInProgressError,
  PaymentCheckoutUnavailableError,
  startPaymentCheckoutForCurrentUser,
} from './payment.service';

/** Server Action module intentionally exports async functions only. */
export async function startPaymentCheckoutAction(
  projectId: string,
  _previousState: StartPaymentCheckoutActionState,
  _formData: FormData,
): Promise<StartPaymentCheckoutActionState> {
  void _previousState;
  void _formData;

  let checkout: Awaited<ReturnType<typeof startPaymentCheckoutForCurrentUser>>;

  try {
    checkout = await startPaymentCheckoutForCurrentUser(projectId);
  } catch (error) {
    if (error instanceof PaymentConfigurationError) {
      return {
        message: 'Pembayaran belum dikonfigurasi untuk lingkungan ini.',
        status: 'error',
      };
    }

    if (error instanceof PaymentAccessDeniedError) {
      return {
        message: 'Pembayaran tidak dapat dimulai untuk undangan ini.',
        status: 'error',
      };
    }

    if (error instanceof PaymentCheckoutInProgressError) {
      return {
        message: 'Pembayaran sedang disiapkan. Coba lagi beberapa saat lagi.',
        status: 'error',
      };
    }

    if (error instanceof PaymentCheckoutUnavailableError) {
      return {
        message: 'Pembayaran belum bisa dimulai. Coba lagi beberapa saat lagi.',
        status: 'error',
      };
    }

    console.error('Seraya payment checkout action failed.', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
    return {
      message: 'Pembayaran belum bisa dimulai. Coba lagi beberapa saat lagi.',
      status: 'error',
    };
  }

  // The adapter validates this as the configured Midtrans HTTPS host before it
  // reaches the action. Typed Routes models internal paths only, so an external
  // hosted checkout needs this narrow assertion at the redirect boundary.
  redirect(checkout.checkoutUrl as never);
}
