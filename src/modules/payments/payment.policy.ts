import 'server-only';

import type { OwnedProject } from '@/modules/projects/project.repository';

import { getProjectPublishEligibility } from './payment-publish-policy';
import type { PaymentTransaction } from './payment.types';

/** SRY-010 checkout seam. */
export function canProjectStartPayment(project: OwnedProject) {
  return project.deleted_at === null;
}

/**
 * Retained as the narrow policy seam expected by checkout/publication callers.
 * M0011 repeats the verified-payment requirement inside the DB publish function.
 */
export function canProjectPublish(project: OwnedProject, payments: readonly PaymentTransaction[]) {
  return getProjectPublishEligibility(project, payments).allowed;
}
