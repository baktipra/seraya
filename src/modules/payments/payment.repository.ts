import 'server-only';

import type { OwnedProject } from '@/modules/projects/project.repository';
import { createAdminSupabaseClient } from '@/server/supabase/admin';
import { createServerSupabaseClient } from '@/server/supabase/server';

import {
  MIDTRANS_SNAP_PROVIDER,
  PAYMENT_CURRENCY,
  PAYMENT_PRODUCT_CODE,
  type PaymentAttemptReservation,
  type PaymentTransaction,
  type VerifiedPaymentWebhookApplication,
} from './payment.types';

const paymentTransactionSelect =
  'id, project_id, provider, provider_order_id, product_code, pricing_version, amount_idr, currency, status, provider_checkout_url, provider_transaction_id, provider_payment_type, provider_status, checkout_started_at, expires_at, paid_at, created_at, updated_at';

export class PaymentRepositoryError extends Error {
  constructor() {
    super('The payment repository could not complete the request.');
    this.name = 'PaymentRepositoryError';
  }
}

export class PaymentWebhookRepositoryError extends Error {
  constructor() {
    super('The verified payment webhook could not be applied.');
    this.name = 'PaymentWebhookRepositoryError';
  }
}

export class PaymentWebhookNotMatchedError extends Error {
  constructor() {
    super('No matching payment transaction is available for this webhook.');
    this.name = 'PaymentWebhookNotMatchedError';
  }
}

function isPaymentStatus(value: unknown): value is PaymentTransaction['status'] {
  return (
    value === 'created' ||
    value === 'pending' ||
    value === 'paid' ||
    value === 'failed' ||
    value === 'expired' ||
    value === 'cancelled' ||
    value === 'refunded'
  );
}

function mapPaymentTransaction(record: unknown): PaymentTransaction {
  const payment = record as PaymentTransaction;

  if (
    !payment ||
    payment.provider !== MIDTRANS_SNAP_PROVIDER ||
    payment.product_code !== PAYMENT_PRODUCT_CODE ||
    payment.currency !== PAYMENT_CURRENCY ||
    !isPaymentStatus(payment.status) ||
    !Number.isSafeInteger(Number(payment.amount_idr)) ||
    Number(payment.amount_idr) <= 0
  ) {
    throw new PaymentRepositoryError();
  }

  return {
    ...payment,
    amount_idr: Number(payment.amount_idr),
  };
}

function mapPaymentAttemptReservation(record: unknown): PaymentAttemptReservation {
  const value = record as PaymentTransaction & { created_now?: unknown };
  const payment = mapPaymentTransaction(value);

  if (typeof value.created_now !== 'boolean') {
    throw new PaymentRepositoryError();
  }

  return { ...payment, created_now: value.created_now };
}

export async function getLatestPaymentForVerifiedProject(
  project: OwnedProject,
): Promise<PaymentTransaction | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('payment_transactions')
    .select(paymentTransactionSelect)
    .eq('project_id', project.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new PaymentRepositoryError();
  }

  return data ? mapPaymentTransaction(data) : null;
}

export async function listPaymentsForVerifiedProject(
  project: OwnedProject,
): Promise<PaymentTransaction[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('payment_transactions')
    .select(paymentTransactionSelect)
    .eq('project_id', project.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw new PaymentRepositoryError();
  }

  return (data ?? []).map(mapPaymentTransaction);
}

export async function reservePaymentCheckoutAttemptWithAdmin(input: {
  amountIdr: number;
  expectedOwnerId: string;
  pricingVersion: string;
  projectId: string;
}): Promise<PaymentAttemptReservation> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .rpc('reserve_payment_checkout_attempt', {
      expected_owner_id: input.expectedOwnerId,
      target_amount_idr: input.amountIdr,
      target_currency: PAYMENT_CURRENCY,
      target_pricing_version: input.pricingVersion,
      target_product_code: PAYMENT_PRODUCT_CODE,
      target_project_id: input.projectId,
    })
    .single();

  if (error || !data) {
    throw new PaymentRepositoryError();
  }

  return mapPaymentAttemptReservation(data);
}

export async function startPaymentCheckoutAttemptWithAdmin(input: {
  checkoutUrl: string;
  paymentId: string;
}): Promise<PaymentTransaction> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .rpc('start_payment_checkout_attempt', {
      target_checkout_url: input.checkoutUrl,
      target_payment_id: input.paymentId,
    })
    .single();

  if (error || !data) {
    throw new PaymentRepositoryError();
  }

  return mapPaymentTransaction(data);
}

export async function failPaymentCheckoutAttemptWithAdmin(paymentId: string): Promise<void> {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.rpc('fail_payment_checkout_attempt', {
    target_payment_id: paymentId,
  });

  if (error) {
    throw new PaymentRepositoryError();
  }
}

function mapVerifiedWebhookApplication(record: unknown): VerifiedPaymentWebhookApplication {
  const value = record as PaymentTransaction & {
    applied_payment_status?: unknown;
    duplicate?: unknown;
    webhook_event_id?: unknown;
  };
  const payment = mapPaymentTransaction(value);

  if (
    typeof value.duplicate !== 'boolean' ||
    (value.webhook_event_id !== null && typeof value.webhook_event_id !== 'string') ||
    (value.applied_payment_status !== null && !isPaymentStatus(value.applied_payment_status))
  ) {
    throw new PaymentWebhookRepositoryError();
  }

  return {
    ...payment,
    applied_payment_status: value.applied_payment_status ?? null,
    duplicate: value.duplicate,
    webhook_event_id: value.webhook_event_id ?? null,
  };
}

/**
 * Calls the security-definer database boundary after the route has verified
 * Midtrans' SHA-512 signature. Browser roles have no EXECUTE privilege on the
 * function and no table privileges on the webhook ledger.
 */
export async function applyVerifiedMidtransWebhookWithAdmin(input: {
  amountIdr: number;
  currency: string | null;
  eventFingerprint: string;
  paymentType: string | null;
  providerOrderId: string;
  providerStatusCode: string;
  providerTransactionId: string | null;
  providerTransactionStatus: string;
  targetStatus: PaymentTransaction['status'] | null;
}): Promise<VerifiedPaymentWebhookApplication> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .rpc('apply_verified_midtrans_payment_webhook', {
      target_amount_idr: input.amountIdr,
      target_currency: input.currency,
      target_event_fingerprint: input.eventFingerprint,
      target_payment_status: input.targetStatus,
      target_provider_order_id: input.providerOrderId,
      target_provider_payment_type: input.paymentType,
      target_provider_status_code: input.providerStatusCode,
      target_provider_transaction_id: input.providerTransactionId,
      target_provider_transaction_status: input.providerTransactionStatus,
    })
    .single();

  if (error || !data) {
    if (error?.code === 'P0002' || error?.code === '22023') {
      throw new PaymentWebhookNotMatchedError();
    }

    throw new PaymentWebhookRepositoryError();
  }

  return mapVerifiedWebhookApplication(data);
}
