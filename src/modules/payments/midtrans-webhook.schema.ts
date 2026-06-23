import { z } from 'zod';

import type { MidtransWebhookNotification } from './midtrans-webhook.types';

const safeString = (maximum: number) => z.string().trim().min(1).max(maximum);
const optionalSafeString = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum)
    .transform((value) => value || null)
    .optional()
    .nullable()
    .transform((value) => value ?? null);

const scalarStatusCode = z
  .union([z.string(), z.number().int().safe()])
  .transform((value) => String(value).trim())
  .pipe(z.string().min(1).max(16));

function normalizeGrossAmount(value: unknown) {
  const raw =
    typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim() : null;

  if (!raw || !/^(0|[1-9]\d*)(?:\.0+)?$/.test(raw)) {
    return null;
  }

  const amount = Number(raw.split('.')[0]);

  if (!Number.isSafeInteger(amount) || amount <= 0) {
    return null;
  }

  return { amount, raw };
}

const grossAmountSchema = z.union([z.string(), z.number().finite()]).transform((value, context) => {
  const normalized = normalizeGrossAmount(value);

  if (!normalized) {
    context.addIssue({
      code: 'custom',
      message: 'Nilai pembayaran webhook tidak valid.',
    });
    return z.NEVER;
  }

  return normalized;
});

const notificationInputSchema = z
  .object({
    currency: optionalSafeString(12),
    fraud_status: optionalSafeString(32),
    gross_amount: grossAmountSchema,
    order_id: safeString(160),
    payment_type: optionalSafeString(80),
    signature_key: z
      .string()
      .trim()
      .regex(/^[a-fA-F0-9]{128}$/),
    status_code: scalarStatusCode,
    transaction_id: optionalSafeString(160),
    transaction_status: safeString(64),
  })
  .passthrough();

export function parseMidtransWebhookNotification(value: unknown): MidtransWebhookNotification {
  const parsed = notificationInputSchema.parse(value);

  return {
    currency: parsed.currency?.toUpperCase() ?? null,
    fraudStatus: parsed.fraud_status?.toLowerCase() ?? null,
    grossAmountIdr: parsed.gross_amount.amount,
    grossAmountRaw: parsed.gross_amount.raw,
    orderId: parsed.order_id,
    paymentType: parsed.payment_type,
    signatureKey: parsed.signature_key.toLowerCase(),
    statusCode: parsed.status_code,
    transactionId: parsed.transaction_id,
    transactionStatus: parsed.transaction_status.toLowerCase(),
  };
}
