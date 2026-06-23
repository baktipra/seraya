import 'server-only';

import type { OwnedProject } from '@/modules/projects/project.repository';
import { createServerSupabaseClient } from '@/server/supabase/server';

import { mapInvitationDraft, type InvitationDraftDatabaseRecord } from './invitation-draft.mapper';
import type { InvitationDraft } from './invitation-draft.types';

const activeDraftSelect =
  'id, project_id, schema_version, content, created_at, updated_at, deleted_at';

export class InvitationDraftRepositoryError extends Error {
  constructor() {
    super('The invitation draft repository could not complete the request.');
    this.name = 'InvitationDraftRepositoryError';
  }
}

/**
 * This function deliberately accepts only a previously verified, active owned
 * project record. Route code must not query a draft directly from an untrusted
 * project id. RLS remains authoritative and this keeps server ownership flow
 * explicit.
 */
export async function getActiveInvitationDraftForVerifiedProject(
  project: OwnedProject,
): Promise<InvitationDraft | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('invitation_drafts')
    .select(activeDraftSelect)
    .eq('project_id', project.id)
    .is('deleted_at', null)
    .maybeSingle<InvitationDraftDatabaseRecord>();

  if (error) {
    throw new InvitationDraftRepositoryError();
  }

  if (!data) {
    return null;
  }

  try {
    return mapInvitationDraft(data);
  } catch {
    throw new InvitationDraftRepositoryError();
  }
}

/**
 * Updates only the active draft already loaded through a verified owned
 * project. The explicit draft id and soft-delete predicate keep this narrow;
 * no snapshot table, publication function, or public cache path is involved.
 */
export async function updateActiveInvitationDraftForVerifiedProject(input: {
  content: InvitationDraft['content'];
  draft: InvitationDraft;
  project: OwnedProject;
}): Promise<InvitationDraft> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('invitation_drafts')
    .update({ content: input.content })
    .eq('id', input.draft.id)
    .eq('project_id', input.project.id)
    .is('deleted_at', null)
    .select(activeDraftSelect)
    .maybeSingle<InvitationDraftDatabaseRecord>();

  if (error || !data) {
    throw new InvitationDraftRepositoryError();
  }

  try {
    return mapInvitationDraft(data);
  } catch {
    throw new InvitationDraftRepositoryError();
  }
}
