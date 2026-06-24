import 'server-only';

import { cache } from 'react';

import { AuthenticationRequiredError } from './current-user';
import { getOwnedProjectById, type OwnedProject } from '@/modules/projects/project.repository';
import { createServerSupabaseClient } from '@/server/supabase/server';

export type DashboardVerifiedClaimsIdentity = Readonly<{
  id: string;
}>;

const SUPABASE_AUTH_SUBJECT_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getVerifiedDashboardAccountId(claims: unknown): string | null {
  if (!claims || typeof claims !== 'object' || Array.isArray(claims)) {
    return null;
  }

  const subject = (claims as Record<string, unknown>).sub;

  if (typeof subject !== 'string' || !SUPABASE_AUTH_SUBJECT_PATTERN.test(subject)) {
    return null;
  }

  return subject;
}

async function resolveCurrentDashboardUserFromClaims(): Promise<DashboardVerifiedClaimsIdentity> {
  const supabase = await createServerSupabaseClient();

  try {
    const claimsResult = await supabase.auth.getClaims();
    const accountId = claimsResult.error
      ? null
      : getVerifiedDashboardAccountId(claimsResult.data?.claims);

    if (!accountId) {
      throw new AuthenticationRequiredError();
    }

    return { id: accountId };
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      throw error;
    }

    // Claims verification stays intentionally generic at the dashboard RSC
    // boundary. The dashboard layout maps this to the existing login recovery
    // path without exposing JWT or provider details to the browser.
    throw new AuthenticationRequiredError();
  }
}

/**
 * React.cache is scoped by React to the current Server Component render request.
 * This is deliberately not a cross-request cache: each dashboard render verifies
 * its own cookie-backed JWT claims and does not share identity between users.
 */
export const getCurrentDashboardUserForRequest = cache(
  async (): Promise<DashboardVerifiedClaimsIdentity> => {
    return resolveCurrentDashboardUserFromClaims();
  },
);

/**
 * Server Component-only owner scope for one route projectId. The key is the
 * server route parameter; the account ID always comes from verified JWT claims
 * and is never accepted from browser input.
 */
export const getOwnedProjectContextForRequest = cache(
  async (projectId: string): Promise<OwnedProject> => {
    const user = await getCurrentDashboardUserForRequest();
    return getOwnedProjectById(projectId, user.id);
  },
);
