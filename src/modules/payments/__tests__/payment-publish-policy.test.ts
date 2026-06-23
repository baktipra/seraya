import { describe, expect, it } from 'vitest';

import type { OwnedProject } from '@/modules/projects/project.repository';

import { getProjectPublishEligibility } from '../payment-publish-policy';
import type { PaymentTransaction } from '../payment.types';

const project: OwnedProject = {
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

const payment: PaymentTransaction = {
  amount_idr: 99000,
  checkout_started_at: '2026-06-21T00:00:00.000Z',
  created_at: '2026-06-21T00:00:00.000Z',
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
  status: 'pending',
  updated_at: '2026-06-21T00:00:00.000Z',
};

describe('payment publish eligibility', () => {
  it('requires a verified paid activation for advisory publish eligibility', () => {
    expect(getProjectPublishEligibility(project, [])).toEqual({
      allowed: false,
      reason: 'payment_required',
    });
    expect(getProjectPublishEligibility(project, [payment])).toEqual({
      allowed: false,
      reason: 'payment_pending',
    });
    expect(
      getProjectPublishEligibility(project, [
        { ...payment, paid_at: '2026-06-21T00:05:00.000Z', status: 'paid' },
      ]),
    ).toEqual({ allowed: true, reason: 'verified_payment' });
  });

  it('keeps a prior verified payment as entitlement even when a later retry failed', () => {
    expect(
      getProjectPublishEligibility(project, [
        { ...payment, status: 'failed' },
        {
          ...payment,
          id: '44444444-4444-4444-8444-444444444444',
          paid_at: '2026-06-21T00:05:00.000Z',
          status: 'paid',
        },
      ]),
    ).toEqual({ allowed: true, reason: 'verified_payment' });
  });
});
