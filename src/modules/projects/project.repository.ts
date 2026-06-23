import 'server-only';

import { createServerSupabaseClient } from '@/server/supabase/server';

import { getProjectCoupleLabel } from './project.mapper';
import { assertProjectOwnership } from './project.policy';

export type ProjectOwnershipRecord = {
  account_id: string;
  deleted_at: string | null;
  id: string;
};

export type OwnedProject = ProjectOwnershipRecord & {
  default_timezone: string;
  event_city: string;
  event_date_primary: string | null;
  person_one_name: string;
  person_two_name: string;
  slug: string;
  status: string;
};

export type ProjectLauncherItem = Pick<
  OwnedProject,
  'event_city' | 'event_date_primary' | 'id' | 'person_one_name' | 'person_two_name' | 'status'
> & {
  coupleLabel: string;
};

export type CreateWeddingProjectRecord = {
  accountId: string;
  eventCity: string;
  eventDatePrimary: string;
  personOneName: string;
  personTwoName: string;
  slug: string;
};

export class ProjectSlugAlreadyExistsError extends Error {
  constructor() {
    super('The requested project slug already exists.');
    this.name = 'ProjectSlugAlreadyExistsError';
  }
}

export class ProjectRepositoryError extends Error {
  constructor() {
    super('The project repository could not complete the request.');
    this.name = 'ProjectRepositoryError';
  }
}

const activeProjectSelect =
  'id, account_id, slug, status, default_timezone, event_date_primary, person_one_name, person_two_name, event_city, deleted_at';

/**
 * Default dashboard scope: active projects only. RLS remains authoritative,
 * while the explicit account + soft-delete filters make the intended product
 * query invariant visible in one reusable place.
 */
export async function listOwnedActiveProjects(accountId: string): Promise<ProjectLauncherItem[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('wedding_projects')
    .select('id, status, event_date_primary, person_one_name, person_two_name, event_city')
    .eq('account_id', accountId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    throw new ProjectRepositoryError();
  }

  return (data ?? []).map((project) => ({
    coupleLabel: getProjectCoupleLabel(project.person_one_name, project.person_two_name),
    event_city: project.event_city,
    event_date_primary: project.event_date_primary,
    id: project.id,
    person_one_name: project.person_one_name,
    person_two_name: project.person_two_name,
    status: project.status,
  }));
}

/**
 * A single INSERT is atomic in PostgreSQL. It deliberately omits account-scoped
 * defaults such as status/timezone so the locked database contract owns them.
 * M0005 attaches a database trigger, so this same INSERT either creates both
 * the project and its default invitation draft or rolls the transaction back.
 */
export async function createWeddingProject(
  project: CreateWeddingProjectRecord,
): Promise<OwnedProject> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('wedding_projects')
    .insert({
      account_id: project.accountId,
      event_city: project.eventCity,
      event_date_primary: project.eventDatePrimary,
      person_one_name: project.personOneName,
      person_two_name: project.personTwoName,
      slug: project.slug,
    })
    .select(activeProjectSelect)
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new ProjectSlugAlreadyExistsError();
    }

    throw new ProjectRepositoryError();
  }

  return assertProjectOwnership(data as OwnedProject | null, project.accountId);
}

/** Minimal ownership-aware read helper for private project pages. */
export async function getOwnedProjectById(
  projectId: string,
  accountId: string,
): Promise<OwnedProject> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('wedding_projects')
    .select(activeProjectSelect)
    .eq('id', projectId)
    .eq('account_id', accountId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw new ProjectRepositoryError();
  }

  return assertProjectOwnership(data as OwnedProject | null, accountId);
}
