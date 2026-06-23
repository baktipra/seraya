import 'server-only';

import { PAYMENT_PRODUCT_CODE, PAYMENT_PRODUCT_LABEL } from '../payment.types';

import type {
  CreateCheckoutInput,
  CreateCheckoutResult,
  PaymentProvider,
} from './payment-provider.types';

const midtransEndpoints = {
  production: 'https://app.midtrans.com/snap/v1/transactions',
  sandbox: 'https://app.sandbox.midtrans.com/snap/v1/transactions',
} as const;

const midtransRedirectHosts = {
  production: 'app.midtrans.com',
  sandbox: 'app.sandbox.midtrans.com',
} as const;

export class MidtransSnapProviderError extends Error {
  constructor() {
    super('Midtrans Snap checkout could not be created.');
    this.name = 'MidtransSnapProviderError';
  }
}

function validateMidtransRedirectUrl(
  value: unknown,
  environment: CreateCheckoutInput['environment'],
) {
  if (typeof value !== 'string') {
    throw new MidtransSnapProviderError();
  }

  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    throw new MidtransSnapProviderError();
  }

  if (
    parsed.protocol !== 'https:' ||
    parsed.hostname !== midtransRedirectHosts[environment] ||
    !parsed.pathname.startsWith('/snap/')
  ) {
    throw new MidtransSnapProviderError();
  }

  return parsed.toString();
}

/**
 * Minimal hosted-redirect adapter. It deliberately returns only the validated
 * checkout URL; Snap tokens, auth headers, and provider response payloads
 * never cross into browser-facing code or database records.
 */
export class MidtransSnapProvider implements PaymentProvider {
  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    const authorization = Buffer.from(`${input.serverKey}:`).toString('base64');

    let response: Response;

    try {
      response = await fetch(midtransEndpoints[input.environment], {
        body: JSON.stringify({
          callbacks: {
            finish: input.finishRedirectUrl,
          },
          item_details: [
            {
              id: PAYMENT_PRODUCT_CODE,
              name: PAYMENT_PRODUCT_LABEL,
              price: input.amountIdr,
              quantity: 1,
            },
          ],
          transaction_details: {
            gross_amount: input.amountIdr,
            order_id: input.orderId,
          },
        }),
        headers: {
          Accept: 'application/json',
          Authorization: `Basic ${authorization}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
      });
    } catch {
      throw new MidtransSnapProviderError();
    }

    if (!response.ok) {
      throw new MidtransSnapProviderError();
    }

    let payload: unknown;

    try {
      payload = await response.json();
    } catch {
      throw new MidtransSnapProviderError();
    }

    const redirectUrl =
      typeof payload === 'object' && payload !== null
        ? (payload as { redirect_url?: unknown }).redirect_url
        : undefined;

    return {
      checkoutUrl: validateMidtransRedirectUrl(redirectUrl, input.environment),
    };
  }
}

export { validateMidtransRedirectUrl };
