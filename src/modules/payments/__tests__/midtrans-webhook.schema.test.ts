import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { parseMidtransWebhookNotification } from '../midtrans-webhook.schema';
import {
  createMidtransWebhookEventFingerprint,
  hasValidMidtransWebhookSignature,
  mapMidtransWebhookPaymentStatus,
} from '../midtrans-webhook.types';

const serverKey = 'test-server-key';

function validPayload(overrides: Record<string, unknown> = {}) {
  const orderId =
    (overrides.order_id as string | undefined) ?? 'sry-pay-11111111-1111-4111-8111-111111111111';
  const statusCode = (overrides.status_code as string | undefined) ?? '200';
  const grossAmount = (overrides.gross_amount as string | undefined) ?? '99000.00';
  const signature = createHash('sha512')
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest('hex');

  return {
    gross_amount: grossAmount,
    order_id: orderId,
    signature_key: signature,
    status_code: statusCode,
    transaction_status: 'settlement',
    ...overrides,
  };
}

describe('Midtrans webhook notification contract', () => {
  it('parses valid integer IDR values including provider decimal-zero representation', () => {
    expect(parseMidtransWebhookNotification(validPayload())).toMatchObject({
      grossAmountIdr: 99000,
      grossAmountRaw: '99000.00',
      transactionStatus: 'settlement',
    });

    expect(parseMidtransWebhookNotification(validPayload({ gross_amount: '10000' }))).toMatchObject(
      {
        grossAmountIdr: 10000,
        grossAmountRaw: '10000',
      },
    );
  });

  it('rejects fractional IDR, malformed fields, and does not treat unknown data as trusted', () => {
    expect(() =>
      parseMidtransWebhookNotification(validPayload({ gross_amount: '10000.50' })),
    ).toThrow();
    expect(() =>
      parseMidtransWebhookNotification(validPayload({ signature_key: 'not-a-signature' })),
    ).toThrow();
    expect(() => parseMidtransWebhookNotification({})).toThrow();
  });

  it('verifies SHA-512 signatures in constant-time helper and derives redacted fingerprints', () => {
    const notification = parseMidtransWebhookNotification(validPayload());

    expect(hasValidMidtransWebhookSignature(notification, serverKey)).toBe(true);
    expect(hasValidMidtransWebhookSignature(notification, 'wrong-key')).toBe(false);
    expect(createMidtransWebhookEventFingerprint(notification)).toMatch(/^[a-f0-9]{64}$/);
  });

  it('maps only the locked trusted payment transitions', () => {
    expect(mapMidtransWebhookPaymentStatus('settlement', null)).toBe('paid');
    expect(mapMidtransWebhookPaymentStatus('capture', 'accept')).toBe('paid');
    expect(mapMidtransWebhookPaymentStatus('capture', 'deny')).toBe('failed');
    expect(mapMidtransWebhookPaymentStatus('pending', null)).toBe('pending');
    expect(mapMidtransWebhookPaymentStatus('refund', null)).toBe('refunded');
    expect(mapMidtransWebhookPaymentStatus('authorize', null)).toBeNull();
    expect(mapMidtransWebhookPaymentStatus('unknown', null)).toBeNull();
  });
});
