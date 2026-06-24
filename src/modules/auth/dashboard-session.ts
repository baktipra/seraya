import 'server-only';

import { cache } from 'react';

import { createServerSupabaseClient } from '@/server/supabase/server';
import {
  listOwnedActiveProjects,
  type ProjectLauncherItem,
} from '@/modules/projects/project.repository';

import {
  getCurrentDashboardUserForRequest,
  type DashboardVerifiedClaimsIdentity,
} from './dashboard-request-context';

export type DashboardProfile = {
  display_name: string | null;
  email: string | null;
};

export type DashboardSessionContext = {
  hasActiveProject: boolean;
  profile: DashboardProfile | null;
  profileUnavailable: boolean;
  projects: ProjectLauncherItem[];
  user: DashboardVerifiedClaimsIdentity;
};

/**
 * Shell bootstrap only: it verifies the trigger-backed profile is readable and
 * loads the reusable active-project scope. It does not create or mutate data.
 */
export const getDashboardSessionContextForRequest = cache(
  async (): Promise<DashboardSessionContext> => {
    const user = await getCurrentDashboardUserForRequest();
    const supabase = await createServerSupabaseClient();

    const [profileResult, projectsResult] = await Promise.allSettled([
      supabase
        .from('profiles')
        .select('display_name, email')
        .eq('id', user.id)
        .maybeSingle<DashboardProfile>(),
      listOwnedActiveProjects(user.id),
    ]);

    const profileQuery = profileResult.status === 'fulfilled' ? profileResult.value : null;
    const projects = projectsResult.status === 'fulfilled' ? projectsResult.value : [];

    if (profileResult.status === 'rejected' || profileQuery?.error || !profileQuery?.data) {
      console.error('Seraya dashboard profile unavailable after authenticated session load.', {
        profileErrorCode: profileQuery?.error?.code,
        userId: user.id,
      });
    }

    if (projectsResult.status === 'rejected') {
      console.error('Seraya dashboard project launcher query failed.', {
        errorName:
          projectsResult.reason instanceof Error ? projectsResult.reason.name : 'UnknownError',
        userId: user.id,
      });
    }

    return {
      hasActiveProject: projects.length > 0,
      profile: profileQuery?.data ?? null,
      profileUnavailable: Boolean(
        profileResult.status === 'rejected' || profileQuery?.error || !profileQuery?.data,
      ),
      projects,
      user,
    };
  },
);
