import 'server-only';

import type { OwnedProject } from '@/modules/projects/project.repository';

import {
  MIDTRANS_SNAP_PROVIDER,
  PAYMENT_PRODUCT_CODE,
  type PaymentTransaction,
  type ProjectPublishEligibility,
} from './payment.types';

function isVerifiedActivationPayment(payment: PaymentTransaction) {
  return (
    payment.provider === MIDTRANS_SNAP_PROVIDER &&
    payment.product_code === PAYMENT_PRODUCT_CODE &&
    payment.status === 'paid' &&
    payment.paid_at !== null
  );
}

/**
 * Advisory dashboard policy only. M0011 is the final authority and repeats the
 * same entitlement check inside `publish_invitation_snapshot`.
 */
export function getProjectPublishEligibility(
  project: OwnedProject,
  payments: readonly PaymentTransaction[],
): ProjectPublishEligibility {
  void project;

  if (payments.some(isVerifiedActivationPayment)) {
    return { allowed: true, reason: 'verified_payment' };
  }

  const latestPayment = payments[0] ?? null;

  if (!latestPayment) {
    return { allowed: false, reason: 'payment_required' };
  }

  if (latestPayment.status === 'created' || latestPayment.status === 'pending') {
    return { allowed: false, reason: 'payment_pending' };
  }

  return { allowed: false, reason: 'payment_not_verified' };
}
