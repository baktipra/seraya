export const PAYMENT_PRODUCT_CODE = 'invitation_activation' as const;
export const PAYMENT_PRODUCT_LABEL = 'Aktivasi undangan Seraya' as const;
export const PAYMENT_PRICING_VERSION = 'v1' as const;
export const PAYMENT_CURRENCY = 'IDR' as const;
export const MIDTRANS_SNAP_PROVIDER = 'midtrans_snap' as const;

export type PaymentProductCode = typeof PAYMENT_PRODUCT_CODE;
export type PaymentCurrency = typeof PAYMENT_CURRENCY;
export type PaymentProviderName = typeof MIDTRANS_SNAP_PROVIDER;
export type PaymentStatus =
  | 'created'
  | 'pending'
  | 'paid'
  | 'failed'
  | 'expired'
  | 'cancelled'
  | 'refunded';

export type PaymentTransaction = {
  amount_idr: number;
  checkout_started_at: string | null;
  created_at: string;
  currency: PaymentCurrency;
  expires_at: string | null;
  id: string;
  paid_at: string | null;
  pricing_version: string;
  product_code: PaymentProductCode;
  project_id: string;
  provider: PaymentProviderName;
  provider_checkout_url: string | null;
  provider_order_id: string;
  provider_payment_type: string | null;
  provider_status: string | null;
  provider_transaction_id: string | null;
  status: PaymentStatus;
  updated_at: string;
};

export type PaymentAttemptReservation = PaymentTransaction & {
  created_now: boolean;
};

export type VerifiedPaymentWebhookApplication = PaymentTransaction & {
  applied_payment_status: PaymentStatus | null;
  duplicate: boolean;
  webhook_event_id: string | null;
};

export type PaymentActivationConfiguration = {
  amountIdr: number;
  currency: PaymentCurrency;
  pricingVersion: typeof PAYMENT_PRICING_VERSION;
  productCode: PaymentProductCode;
};

/**
 * Browser-safe summary for dashboard controls. Provider checkout URLs and
 * provider metadata stay server-side in PaymentTransaction repositories.
 */
export type PaymentOverviewPayment = {
  createdAt: string;
  status: PaymentStatus;
};

export type ProjectPublishEligibility =
  | { allowed: true; reason: 'verified_payment' }
  | { allowed: false; reason: 'payment_required' }
  | { allowed: false; reason: 'payment_pending' }
  | { allowed: false; reason: 'payment_not_verified' };

export type PaymentOverview = {
  configuration: PaymentActivationConfiguration | null;
  isConfigured: boolean;
  payment: PaymentOverviewPayment | null;
  publishEligibility: ProjectPublishEligibility;
};

export function formatPaymentAmountIdr(amountIdr: number) {
  return new Intl.NumberFormat('id-ID', {
    currency: PAYMENT_CURRENCY,
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
    style: 'currency',
  }).format(amountIdr);
}
