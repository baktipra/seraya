import { afterEach, describe, expect, it } from 'vitest';

import {
  getPaymentReturnUrl,
  getPaymentRuntimeConfiguration,
  PaymentConfigurationError,
} from '../payment.config';

const environmentKeys = [
  'MIDTRANS_ENVIRONMENT',
  'MIDTRANS_SERVER_KEY',
  'NEXT_PUBLIC_APP_URL',
  'SERAYA_INVITATION_ACTIVATION_PRICE_IDR',
] as const;

const previousEnvironment = Object.fromEntries(
  environmentKeys.map((key) => [key, process.env[key]]),
) as Record<(typeof environmentKeys)[number], string | undefined>;

function setValidEnvironment() {
  process.env.MIDTRANS_ENVIRONMENT = 'sandbox';
  process.env.MIDTRANS_SERVER_KEY = 'test-only-server-key';
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
  process.env.SERAYA_INVITATION_ACTIVATION_PRICE_IDR = '99000';
}

describe('payment runtime configuration', () => {
  afterEach(() => {
    for (const key of environmentKeys) {
      const previous = previousEnvironment[key];

      if (previous === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previous;
      }
    }
  });

  it('reads only server configuration with a positive integer IDR price', () => {
    setValidEnvironment();

    expect(getPaymentRuntimeConfiguration()).toMatchObject({
      amountIdr: 99000,
      appBaseUrl: 'http://localhost:3000',
      currency: 'IDR',
      midtransEnvironment: 'sandbox',
      pricingVersion: 'v1',
      productCode: 'invitation_activation',
    });
  });

  it('rejects a missing/invalid environment, key, price, or app URL without a fallback', () => {
    setValidEnvironment();
    process.env.SERAYA_INVITATION_ACTIVATION_PRICE_IDR = '0';
    expect(() => getPaymentRuntimeConfiguration()).toThrow(PaymentConfigurationError);

    setValidEnvironment();
    process.env.MIDTRANS_ENVIRONMENT = 'test';
    expect(() => getPaymentRuntimeConfiguration()).toThrow(PaymentConfigurationError);

    setValidEnvironment();
    delete process.env.MIDTRANS_SERVER_KEY;
    expect(() => getPaymentRuntimeConfiguration()).toThrow(PaymentConfigurationError);

    setValidEnvironment();
    process.env.NEXT_PUBLIC_APP_URL = 'javascript:alert(1)';
    expect(() => getPaymentRuntimeConfiguration()).toThrow(PaymentConfigurationError);
  });

  it('builds the owner dashboard return route from the configured application base URL', () => {
    expect(
      getPaymentReturnUrl({
        appBaseUrl: 'https://seraya.id',
        projectId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      }),
    ).toBe('https://seraya.id/dashboard/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/billing/return');
  });
});
