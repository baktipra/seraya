import 'server-only';

import { requireCurrentUser } from '@/modules/auth/current-user';
import { getOwnedProjectById, type OwnedProject } from '@/modules/projects/project.repository';

import {
  getPaymentReturnUrl,
  getPaymentRuntimeConfiguration,
  PaymentConfigurationError,
} from './payment.config';
import { getProjectPublishEligibility } from './payment-publish-policy';
import { canProjectStartPayment } from './payment.policy';
import {
  failPaymentCheckoutAttemptWithAdmin,
  listPaymentsForVerifiedProject,
  PaymentRepositoryError,
  reservePaymentCheckoutAttemptWithAdmin,
  startPaymentCheckoutAttemptWithAdmin,
} from './payment.repository';
import type { PaymentOverview, PaymentTransaction } from './payment.types';
import {
  MidtransSnapProvider,
  MidtransSnapProviderError,
} from './providers/midtrans-snap.provider';

export class PaymentAccessDeniedError extends Error {
  constructor() {
    super('The payment resource is not available to the current account.');
    this.name = 'PaymentAccessDeniedError';
  }
}

export class PaymentCheckoutUnavailableError extends Error {
  constructor() {
    super('Payment checkout is not available.');
    this.name = 'PaymentCheckoutUnavailableError';
  }
}

export class PaymentCheckoutInProgressError extends Error {
  constructor() {
    super('Payment checkout is being prepared.');
    this.name = 'PaymentCheckoutInProgressError';
  }
}

export async function getPaymentOverviewForVerifiedProject(
  project: OwnedProject,
): Promise<PaymentOverview> {
  const payments = await listPaymentsForVerifiedProject(project);
  const payment = payments[0] ?? null;
  const publishEligibility = getProjectPublishEligibility(project, payments);

  try {
    const configuration = getPaymentRuntimeConfiguration();

    return {
      configuration: {
        amountIdr: configuration.amountIdr,
        currency: configuration.currency,
        pricingVersion: configuration.pricingVersion,
        productCode: configuration.productCode,
      },
      isConfigured: true,
      payment: payment
        ? {
            createdAt: payment.created_at,
            status: payment.status,
          }
        : null,
      publishEligibility,
    };
  } catch (error) {
    if (error instanceof PaymentConfigurationError) {
      return {
        configuration: null,
        isConfigured: false,
        payment: payment
          ? {
              createdAt: payment.created_at,
              status: payment.status,
            }
          : null,
        publishEligibility,
      };
    }

    throw error;
  }
}

/** Private payment history after verified server project scope. */
export async function getPaymentHistoryForVerifiedProject(project: OwnedProject): Promise<{
  payments: PaymentTransaction[];
  project: OwnedProject;
}> {
  const payments = await listPaymentsForVerifiedProject(project);

  return { payments, project };
}

/** Standalone owner-scoped history loader for non-RSC callers. */
export async function getPaymentHistoryForCurrentUser(projectId: string): Promise<{
  payments: PaymentTransaction[];
  project: OwnedProject;
}> {
  const user = await requireCurrentUser();
  const project = await getOwnedProjectById(projectId, user.id);

  return getPaymentHistoryForVerifiedProject(project);
}

/**
 * Owner-only hosted redirect creation. A pending checkout URL is reused; a
 * concurrent caller seeing a just-created reservation does not call Midtrans a
 * second time. Provider failures only turn the fresh attempt into `failed`.
 */
export async function startPaymentCheckoutForCurrentUser(projectId: string): Promise<{
  checkoutUrl: string;
}> {
  const user = await requireCurrentUser();
  const project = await getOwnedProjectById(projectId, user.id);

  if (!canProjectStartPayment(project)) {
    throw new PaymentAccessDeniedError();
  }

  let config;

  try {
    config = getPaymentRuntimeConfiguration();
  } catch (error) {
    if (error instanceof PaymentConfigurationError) {
      throw error;
    }

    throw new PaymentCheckoutUnavailableError();
  }

  let attempt;

  try {
    attempt = await reservePaymentCheckoutAttemptWithAdmin({
      amountIdr: config.amountIdr,
      expectedOwnerId: user.id,
      pricingVersion: config.pricingVersion,
      projectId: project.id,
    });
  } catch (error) {
    if (error instanceof PaymentRepositoryError) {
      throw new PaymentCheckoutUnavailableError();
    }

    throw error;
  }

  if (attempt.status === 'pending' && attempt.provider_checkout_url) {
    return { checkoutUrl: attempt.provider_checkout_url };
  }

  if (!attempt.created_now || attempt.status !== 'created') {
    throw new PaymentCheckoutInProgressError();
  }

  const provider = new MidtransSnapProvider();

  try {
    const checkout = await provider.createCheckout({
      amountIdr: attempt.amount_idr,
      environment: config.midtransEnvironment,
      finishRedirectUrl: getPaymentReturnUrl({
        appBaseUrl: config.appBaseUrl,
        projectId: project.id,
      }),
      orderId: attempt.provider_order_id,
      serverKey: config.midtransServerKey,
    });

    await startPaymentCheckoutAttemptWithAdmin({
      checkoutUrl: checkout.checkoutUrl,
      paymentId: attempt.id,
    });

    return { checkoutUrl: checkout.checkoutUrl };
  } catch (error) {
    await failPaymentCheckoutAttemptWithAdmin(attempt.id).catch(() => undefined);

    if (error instanceof MidtransSnapProviderError || error instanceof PaymentRepositoryError) {
      throw new PaymentCheckoutUnavailableError();
    }

    throw new PaymentCheckoutUnavailableError();
  }
}
