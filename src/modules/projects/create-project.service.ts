import 'server-only';

import { requireCurrentUser } from '@/modules/auth/current-user';

import type { CreateProjectInput } from './create-project.schema';
import { createWeddingProject } from './project.repository';

/**
 * Server-owned project creation boundary. account_id is intentionally derived
 * from the authenticated Supabase session and is never accepted from form data.
 */
export async function createProjectForCurrentUser(input: CreateProjectInput) {
  const user = await requireCurrentUser();

  return createWeddingProject({
    accountId: user.id,
    eventCity: input.eventCity,
    eventDatePrimary: input.eventDatePrimary,
    personOneName: input.personOneName,
    personTwoName: input.personTwoName,
    slug: input.slug,
  });
}
