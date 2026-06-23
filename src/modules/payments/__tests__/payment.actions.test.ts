import { beforeEach, describe, expect, it, vi } from 'vitest';

const { redirectMock, startCheckoutMock } = vi.hoisted(() => ({
  redirectMock: vi.fn(),
  startCheckoutMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({ redirect: redirectMock }));
vi.mock('../payment.service', () => ({
  PaymentAccessDeniedError: class PaymentAccessDeniedError extends Error {},
  PaymentCheckoutInProgressError: class PaymentCheckoutInProgressError extends Error {},
  PaymentCheckoutUnavailableError: class PaymentCheckoutUnavailableError extends Error {},
  startPaymentCheckoutForCurrentUser: startCheckoutMock,
}));
vi.mock('../payment.config', () => ({
  PaymentConfigurationError: class PaymentConfigurationError extends Error {},
}));

import { initialStartPaymentCheckoutActionState } from '../payment.action-state';
import { startPaymentCheckoutAction } from '../payment.actions';
import { PaymentConfigurationError } from '../payment.config';
import { PaymentCheckoutUnavailableError } from '../payment.service';

function createNextRedirectSignal(destination: string) {
  const redirectSignal = new Error('NEXT_REDIRECT');
  Object.assign(redirectSignal, { digest: `NEXT_REDIRECT;replace;${destination};307;` });
  return redirectSignal;
}

describe('start payment checkout server action', () => {
  beforeEach(() => {
    redirectMock.mockReset();
    startCheckoutMock.mockReset();
  });

  it('redirects only to the trusted server-produced checkout URL after successful checkout setup', async () => {
    const checkoutUrl = 'https://app.sandbox.midtrans.com/snap/v2/vtweb/safe-token';
    const redirectSignal = createNextRedirectSignal(checkoutUrl);
    startCheckoutMock.mockResolvedValue({ checkoutUrl });
    redirectMock.mockImplementation(() => {
      throw redirectSignal;
    });

    const untrustedFormData = new FormData();
    untrustedFormData.set('amount_idr', '1');
    untrustedFormData.set('provider_order_id', 'browser-forged-order');

    await expect(
      startPaymentCheckoutAction(
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        initialStartPaymentCheckoutActionState,
        untrustedFormData,
      ),
    ).rejects.toBe(redirectSignal);

    expect(startCheckoutMock).toHaveBeenCalledWith('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    expect(redirectMock).toHaveBeenCalledWith(checkoutUrl);
  });

  it('keeps missing configuration and checkout failure human-safe', async () => {
    startCheckoutMock.mockRejectedValue(new PaymentConfigurationError());
    await expect(
      startPaymentCheckoutAction('project', initialStartPaymentCheckoutActionState, new FormData()),
    ).resolves.toEqual({
      message: 'Pembayaran belum dikonfigurasi untuk lingkungan ini.',
      status: 'error',
    });

    startCheckoutMock.mockRejectedValue(new PaymentCheckoutUnavailableError());
    await expect(
      startPaymentCheckoutAction('project', initialStartPaymentCheckoutActionState, new FormData()),
    ).resolves.toEqual({
      message: 'Pembayaran belum bisa dimulai. Coba lagi beberapa saat lagi.',
      status: 'error',
    });
  });
});
