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
