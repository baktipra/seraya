import { createHash, timingSafeEqual } from 'node:crypto';

import type { PaymentStatus } from './payment.types';

export type MidtransWebhookNotification = {
  currency: string | null;
  fraudStatus: string | null;
  grossAmountIdr: number;
  grossAmountRaw: string;
  orderId: string;
  paymentType: string | null;
  signatureKey: string;
  statusCode: string;
  transactionId: string | null;
  transactionStatus: string;
};

export type MidtransWebhookStatusMapping = PaymentStatus | null;

export function mapMidtransWebhookPaymentStatus(
  transactionStatus: string,
  fraudStatus: string | null,
): MidtransWebhookStatusMapping {
  switch (transactionStatus) {
    case 'settlement':
      return 'paid';
    case 'capture':
      if (fraudStatus === null || fraudStatus === 'accept') {
        return 'paid';
      }

      return fraudStatus === 'deny' ? 'failed' : null;
    case 'pending':
      return 'pending';
    case 'deny':
    case 'failure':
      return 'failed';
    case 'expire':
      return 'expired';
    case 'cancel':
      return 'cancelled';
    case 'refund':
    case 'partial_refund':
      return 'refunded';
    case 'authorize':
    default:
      return null;
  }
}

/** Exact Midtrans notification signature formula; the received amount text is
 * intentionally preserved because `10000` and `10000.00` are both valid
 * provider representations. */
export function calculateMidtransWebhookSignature(input: {
  grossAmountRaw: string;
  orderId: string;
  serverKey: string;
  statusCode: string;
}) {
  return createHash('sha512')
    .update(`${input.orderId}${input.statusCode}${input.grossAmountRaw}${input.serverKey}`)
    .digest('hex');
}

export function hasValidMidtransWebhookSignature(
  notification: Pick<
    MidtransWebhookNotification,
    'grossAmountRaw' | 'orderId' | 'signatureKey' | 'statusCode'
  >,
  serverKey: string,
) {
  const expected = calculateMidtransWebhookSignature({
    grossAmountRaw: notification.grossAmountRaw,
    orderId: notification.orderId,
    serverKey,
    statusCode: notification.statusCode,
  });
  const received = notification.signatureKey.toLowerCase();

  if (!/^[a-f0-9]{128}$/.test(received)) {
    return false;
  }

  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'));
}

/**
 * Redacted idempotency key. It deliberately excludes signature/server secrets
 * and raw JSON while still distinguishing trusted Midtrans notification facts.
 */
export function createMidtransWebhookEventFingerprint(input: MidtransWebhookNotification) {
  const canonical = [
    'midtrans-snap-v1',
    input.orderId,
    input.statusCode,
    input.grossAmountRaw,
    input.transactionStatus,
    input.transactionId ?? '',
    input.paymentType ?? '',
    input.fraudStatus ?? '',
    input.currency ?? '',
  ].join('\n');

  return createHash('sha256').update(canonical).digest('hex');
}
