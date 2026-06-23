import 'server-only';

import { getMidtransWebhookServerKey, PaymentConfigurationError } from './payment.config';
import {
  applyVerifiedMidtransWebhookWithAdmin,
  PaymentWebhookNotMatchedError,
  PaymentWebhookRepositoryError,
} from './payment.repository';
import {
  createMidtransWebhookEventFingerprint,
  hasValidMidtransWebhookSignature,
  mapMidtransWebhookPaymentStatus,
  type MidtransWebhookNotification,
} from './midtrans-webhook.types';

export class MidtransWebhookSignatureError extends Error {
  constructor() {
    super('Midtrans webhook signature is invalid.');
    this.name = 'MidtransWebhookSignatureError';
  }
}

export class MidtransWebhookUnavailableError extends Error {
  constructor() {
    super('Midtrans webhook processing is unavailable.');
    this.name = 'MidtransWebhookUnavailableError';
  }
}

export async function processVerifiedMidtransWebhook(notification: MidtransWebhookNotification) {
  let serverKey: string;

  try {
    serverKey = getMidtransWebhookServerKey();
  } catch (error) {
    if (error instanceof PaymentConfigurationError) {
      throw new MidtransWebhookUnavailableError();
    }

    throw error;
  }

  if (!hasValidMidtransWebhookSignature(notification, serverKey)) {
    throw new MidtransWebhookSignatureError();
  }

  const targetStatus = mapMidtransWebhookPaymentStatus(
    notification.transactionStatus,
    notification.fraudStatus,
  );

  try {
    return await applyVerifiedMidtransWebhookWithAdmin({
      amountIdr: notification.grossAmountIdr,
      currency: notification.currency,
      eventFingerprint: createMidtransWebhookEventFingerprint(notification),
      paymentType: notification.paymentType,
      providerOrderId: notification.orderId,
      providerStatusCode: notification.statusCode,
      providerTransactionId: notification.transactionId,
      providerTransactionStatus: notification.transactionStatus,
      targetStatus,
    });
  } catch (error) {
    if (error instanceof PaymentWebhookNotMatchedError) {
      throw error;
    }

    if (error instanceof PaymentWebhookRepositoryError) {
      throw new MidtransWebhookUnavailableError();
    }

    throw error;
  }
}
