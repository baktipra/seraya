import 'server-only';

import { cache } from 'react';

import { requireCurrentUser } from './current-user';
import { getOwnedProjectById, type OwnedProject } from '@/modules/projects/project.repository';
import type { SerayaAuthUser } from '@/server/supabase/types';

/**
 * React.cache is scoped by React to the current Server Component render request.
 * This is deliberately not a cross-request cache: each request re-authenticates
 * and re-verifies project ownership against its own cookie-backed server client.
 */
export const getCurrentDashboardUserForRequest = cache(async (): Promise<SerayaAuthUser> => {
  return requireCurrentUser();
});

/**
 * Server Component-only owner scope for one route projectId. The key is the
 * server route parameter; the account ID always comes from the current
 * authenticated user and is never accepted from browser input.
 */
export const getOwnedProjectContextForRequest = cache(
  async (projectId: string): Promise<OwnedProject> => {
    const user = await getCurrentDashboardUserForRequest();
    return getOwnedProjectById(projectId, user.id);
  },
);
