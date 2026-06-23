import 'server-only';

import {
  ApplicationOriginConfigurationError,
  getConfiguredApplicationOrigin,
} from '@/modules/runtime/app-origin';

import {
  PAYMENT_CURRENCY,
  PAYMENT_PRICING_VERSION,
  PAYMENT_PRODUCT_CODE,
  type PaymentActivationConfiguration,
} from './payment.types';

export type MidtransEnvironment = 'sandbox' | 'production';

export class PaymentConfigurationError extends Error {
  constructor() {
    super('Payment configuration is unavailable.');
    this.name = 'PaymentConfigurationError';
  }
}

export type PaymentRuntimeConfiguration = PaymentActivationConfiguration & {
  appBaseUrl: string;
  midtransEnvironment: MidtransEnvironment;
  midtransServerKey: string;
};

function parsePositiveInteger(value: string | undefined) {
  if (!value || !/^\d+$/.test(value)) {
    throw new PaymentConfigurationError();
  }

  const amount = Number(value);

  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new PaymentConfigurationError();
  }

  return amount;
}

/** Webhook verification needs only the server key. It deliberately does not
 * depend on checkout price/App URL so a valid provider notification can still
 * be acknowledged during a local checkout configuration outage. */
function getPaymentApplicationOrigin() {
  try {
    return getConfiguredApplicationOrigin();
  } catch (error) {
    if (error instanceof ApplicationOriginConfigurationError) throw new PaymentConfigurationError();
    throw error;
  }
}

export function getMidtransWebhookServerKey() {
  const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim();

  if (!serverKey) {
    throw new PaymentConfigurationError();
  }

  return serverKey;
}

export function getPaymentRuntimeConfiguration(): PaymentRuntimeConfiguration {
  const environment = process.env.MIDTRANS_ENVIRONMENT;
  const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim();

  if ((environment !== 'sandbox' && environment !== 'production') || !serverKey) {
    throw new PaymentConfigurationError();
  }

  return {
    amountIdr: parsePositiveInteger(process.env.SERAYA_INVITATION_ACTIVATION_PRICE_IDR),
    appBaseUrl: getPaymentApplicationOrigin(),
    currency: PAYMENT_CURRENCY,
    midtransEnvironment: environment,
    midtransServerKey: serverKey,
    pricingVersion: PAYMENT_PRICING_VERSION,
    productCode: PAYMENT_PRODUCT_CODE,
  };
}

export function getPaymentReturnUrl(input: { appBaseUrl: string; projectId: string }) {
  return new URL(`/dashboard/${input.projectId}/billing/return`, input.appBaseUrl).toString();
}
