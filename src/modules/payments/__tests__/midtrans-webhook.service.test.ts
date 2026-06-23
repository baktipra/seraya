import { createHash } from 'node:crypto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { applyWebhookMock, getServerKeyMock } = vi.hoisted(() => ({
  applyWebhookMock: vi.fn(),
  getServerKeyMock: vi.fn(),
}));

vi.mock('../payment.config', () => ({
  getMidtransWebhookServerKey: getServerKeyMock,
  PaymentConfigurationError: class PaymentConfigurationError extends Error {},
}));
vi.mock('../payment.repository', () => ({
  applyVerifiedMidtransWebhookWithAdmin: applyWebhookMock,
  PaymentWebhookNotMatchedError: class PaymentWebhookNotMatchedError extends Error {},
  PaymentWebhookRepositoryError: class PaymentWebhookRepositoryError extends Error {},
}));

import { parseMidtransWebhookNotification } from '../midtrans-webhook.schema';
import {
  MidtransWebhookSignatureError,
  processVerifiedMidtransWebhook,
} from '../midtrans-webhook.service';

function notification(transactionStatus = 'settlement') {
  const orderId = 'sry-pay-11111111-1111-4111-8111-111111111111';
  const statusCode = '200';
  const grossAmount = '99000.00';
  const serverKey = 'webhook-key';

  return parseMidtransWebhookNotification({
    currency: 'IDR',
    gross_amount: grossAmount,
    order_id: orderId,
    payment_type: 'bank_transfer',
    signature_key: createHash('sha512')
      .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
      .digest('hex'),
    status_code: statusCode,
    transaction_id: 'midtrans-transaction-id',
    transaction_status: transactionStatus,
  });
}

describe('verified Midtrans webhook service', () => {
  beforeEach(() => {
    getServerKeyMock.mockReset().mockReturnValue('webhook-key');
    applyWebhookMock.mockReset().mockResolvedValue({ duplicate: false, status: 'paid' });
  });

  it('verifies before applying only trusted order, amount, and mapped status', async () => {
    await expect(processVerifiedMidtransWebhook(notification())).resolves.toMatchObject({
      status: 'paid',
    });

    expect(applyWebhookMock).toHaveBeenCalledWith(
      expect.objectContaining({
        amountIdr: 99000,
        currency: 'IDR',
        providerOrderId: 'sry-pay-11111111-1111-4111-8111-111111111111',
        providerTransactionStatus: 'settlement',
        targetStatus: 'paid',
      }),
    );
  });

  it('never applies an invalid signature', async () => {
    const invalid = { ...notification(), signatureKey: '0'.repeat(128) };

    await expect(processVerifiedMidtransWebhook(invalid)).rejects.toBeInstanceOf(
      MidtransWebhookSignatureError,
    );
    expect(applyWebhookMock).not.toHaveBeenCalled();
  });

  it('records unsupported statuses with no trusted payment transition', async () => {
    await processVerifiedMidtransWebhook(notification('authorize'));

    expect(applyWebhookMock).toHaveBeenCalledWith(expect.objectContaining({ targetStatus: null }));
  });
});
