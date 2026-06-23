import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createCheckoutMock,
  failAttemptMock,
  getOwnedProjectMock,
  listPaymentsMock,
  requireCurrentUserMock,
  reserveAttemptMock,
  startAttemptMock,
} = vi.hoisted(() => ({
  createCheckoutMock: vi.fn(),
  failAttemptMock: vi.fn(),
  getOwnedProjectMock: vi.fn(),
  listPaymentsMock: vi.fn(),
  requireCurrentUserMock: vi.fn(),
  reserveAttemptMock: vi.fn(),
  startAttemptMock: vi.fn(),
}));

vi.mock('@/modules/auth/current-user', () => ({ requireCurrentUser: requireCurrentUserMock }));
vi.mock('@/modules/projects/project.repository', () => ({
  getOwnedProjectById: getOwnedProjectMock,
}));
vi.mock('../payment.repository', () => ({
  PaymentRepositoryError: class PaymentRepositoryError extends Error {},
  failPaymentCheckoutAttemptWithAdmin: failAttemptMock,
  listPaymentsForVerifiedProject: listPaymentsMock,
  reservePaymentCheckoutAttemptWithAdmin: reserveAttemptMock,
  startPaymentCheckoutAttemptWithAdmin: startAttemptMock,
}));
vi.mock('../providers/midtrans-snap.provider', () => ({
  MidtransSnapProvider: class MidtransSnapProvider {
    createCheckout = createCheckoutMock;
  },
  MidtransSnapProviderError: class MidtransSnapProviderError extends Error {},
}));

import {
  getPaymentOverviewForVerifiedProject,
  PaymentCheckoutInProgressError,
  startPaymentCheckoutForCurrentUser,
} from '../payment.service';

const project = {
  account_id: '11111111-1111-1111-1111-111111111111',
  default_timezone: 'Asia/Jakarta',
  deleted_at: null,
  event_city: 'Jakarta',
  event_date_primary: '2027-08-17',
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  person_one_name: 'Raka',
  person_two_name: 'Nadia',
  slug: 'raka-nadia',
  status: 'draft',
};

const createdAttempt = {
  amount_idr: 99000,
  checkout_started_at: null,
  created_at: '2026-06-21T00:00:00.000Z',
  created_now: true,
  currency: 'IDR' as const,
  expires_at: null,
  id: '33333333-3333-4333-8333-333333333333',
  paid_at: null,
  pricing_version: 'v1',
  product_code: 'invitation_activation' as const,
  project_id: project.id,
  provider: 'midtrans_snap' as const,
  provider_checkout_url: null,
  provider_order_id: 'sry-pay-33333333-3333-4333-8333-333333333333',
  provider_payment_type: null,
  provider_status: null,
  provider_transaction_id: null,
  status: 'created' as const,
  updated_at: '2026-06-21T00:00:00.000Z',
};

describe('payment checkout service', () => {
  beforeEach(() => {
    process.env.MIDTRANS_ENVIRONMENT = 'sandbox';
    process.env.MIDTRANS_SERVER_KEY = 'sandbox-server-key';
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
    process.env.SERAYA_INVITATION_ACTIVATION_PRICE_IDR = '99000';
    requireCurrentUserMock.mockReset().mockResolvedValue({ id: project.account_id });
    getOwnedProjectMock.mockReset().mockResolvedValue(project);
    listPaymentsMock.mockReset().mockResolvedValue([]);
    reserveAttemptMock.mockReset().mockResolvedValue(createdAttempt);
    startAttemptMock.mockReset().mockResolvedValue({ ...createdAttempt, status: 'pending' });
    failAttemptMock.mockReset().mockResolvedValue(undefined);
    createCheckoutMock.mockReset().mockResolvedValue({
      checkoutUrl: 'https://app.sandbox.midtrans.com/snap/v2/vtweb/safe-token',
    });
  });

  it('uses server environment price and a project-bound return URL, not browser input', async () => {
    await expect(startPaymentCheckoutForCurrentUser(project.id)).resolves.toEqual({
      checkoutUrl: 'https://app.sandbox.midtrans.com/snap/v2/vtweb/safe-token',
    });

    expect(reserveAttemptMock).toHaveBeenCalledWith({
      amountIdr: 99000,
      expectedOwnerId: project.account_id,
      pricingVersion: 'v1',
      projectId: project.id,
    });
    expect(createCheckoutMock).toHaveBeenCalledWith(
      expect.objectContaining({
        amountIdr: 99000,
        finishRedirectUrl: `http://localhost:3000/dashboard/${project.id}/billing/return`,
        orderId: createdAttempt.provider_order_id,
      }),
    );
    expect(startAttemptMock).toHaveBeenCalledWith({
      checkoutUrl: 'https://app.sandbox.midtrans.com/snap/v2/vtweb/safe-token',
      paymentId: createdAttempt.id,
    });
  });

  it('keeps provider checkout metadata out of the browser-facing payment overview', async () => {
    listPaymentsMock.mockResolvedValue([
      {
        ...createdAttempt,
        provider_checkout_url: 'https://app.sandbox.midtrans.com/snap/v2/vtweb/private-token',
        provider_transaction_id: 'provider-transaction-private',
        status: 'pending',
      },
    ]);

    await expect(getPaymentOverviewForVerifiedProject(project)).resolves.toEqual({
      configuration: {
        amountIdr: 99000,
        currency: 'IDR',
        pricingVersion: 'v1',
        productCode: 'invitation_activation',
      },
      isConfigured: true,
      payment: {
        createdAt: createdAttempt.created_at,
        status: 'pending',
      },
      publishEligibility: { allowed: false, reason: 'payment_pending' },
    });
  });

  it('reuses a pending checkout without creating another provider request', async () => {
    reserveAttemptMock.mockResolvedValue({
      ...createdAttempt,
      created_now: false,
      provider_checkout_url: 'https://app.sandbox.midtrans.com/snap/v2/vtweb/reused-token',
      status: 'pending',
    });

    await expect(startPaymentCheckoutForCurrentUser(project.id)).resolves.toEqual({
      checkoutUrl: 'https://app.sandbox.midtrans.com/snap/v2/vtweb/reused-token',
    });
    expect(createCheckoutMock).not.toHaveBeenCalled();
    expect(startAttemptMock).not.toHaveBeenCalled();
  });

  it('does not create a second provider checkout while another server request holds a created attempt', async () => {
    reserveAttemptMock.mockResolvedValue({
      ...createdAttempt,
      created_now: false,
    });

    await expect(startPaymentCheckoutForCurrentUser(project.id)).rejects.toBeInstanceOf(
      PaymentCheckoutInProgressError,
    );
    expect(createCheckoutMock).not.toHaveBeenCalled();
    expect(startAttemptMock).not.toHaveBeenCalled();
  });

  it('marks a fresh attempt failed when provider setup cannot complete', async () => {
    createCheckoutMock.mockRejectedValue(new Error('provider unreachable'));

    await expect(startPaymentCheckoutForCurrentUser(project.id)).rejects.toThrow(/not available/i);
    expect(failAttemptMock).toHaveBeenCalledWith(createdAttempt.id);
  });
  it('reports a verified paid activation as publish-eligible without changing publication itself', async () => {
    listPaymentsMock.mockResolvedValue([
      {
        ...createdAttempt,
        paid_at: '2026-06-21T00:05:00.000Z',
        status: 'paid',
      },
    ]);

    await expect(getPaymentOverviewForVerifiedProject(project)).resolves.toMatchObject({
      publishEligibility: { allowed: true, reason: 'verified_payment' },
    });
  });
});
