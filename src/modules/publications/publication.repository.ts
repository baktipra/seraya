import 'server-only';

import type { OwnedProject } from '@/modules/projects/project.repository';
import { createServerSupabaseClient } from '@/server/supabase/server';

import { parsePublishedInvitationSnapshotRecord } from './published-invitation.schema';
import type { PublishedInvitationSnapshot } from './publication.types';

const publishedSnapshotSelect =
  'id, project_id, slug, revision, template_id, draft_schema_version, snapshot, is_current, published_at, created_at';

export class PublicationRepositoryError extends Error {
  constructor() {
    super('The publication repository could not complete the request.');
    this.name = 'PublicationRepositoryError';
  }
}

export class PublicationAccessDeniedError extends Error {
  constructor() {
    super('The project is not available for publication.');
    this.name = 'PublicationAccessDeniedError';
  }
}

export class PublicationValidationError extends Error {
  constructor() {
    super('The invitation is not ready for publication.');
    this.name = 'PublicationValidationError';
  }
}

export class PublicationPaymentRequiredError extends Error {
  constructor() {
    super('A verified payment is required before publication.');
    this.name = 'PublicationPaymentRequiredError';
  }
}

function mapPublishedSnapshot(record: unknown): PublishedInvitationSnapshot {
  return parsePublishedInvitationSnapshotRecord(record) as PublishedInvitationSnapshot;
}

/**
 * Owner read scope for dashboard surfaces. The verified project object makes
 * the association explicit while RLS remains the final access boundary.
 */
export async function getCurrentPublishedInvitationForVerifiedProject(
  project: OwnedProject,
): Promise<PublishedInvitationSnapshot | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('published_invitation_snapshots')
    .select(publishedSnapshotSelect)
    .eq('project_id', project.id)
    .eq('is_current', true)
    .maybeSingle();

  if (error) {
    throw new PublicationRepositoryError();
  }

  if (!data) {
    return null;
  }

  try {
    return mapPublishedSnapshot(data);
  } catch {
    throw new PublicationRepositoryError();
  }
}

/**
 * Delivery Center needs only the existence of a current immutable snapshot.
 * Keep this separate from the owner publication reader so no snapshot JSON is
 * selected for readiness or share-command gates.
 */
export async function hasCurrentPublishedInvitationForVerifiedProject(
  project: OwnedProject,
): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('published_invitation_snapshots')
    .select('id')
    .eq('project_id', project.id)
    .eq('is_current', true)
    .maybeSingle();

  if (error) {
    throw new PublicationRepositoryError();
  }

  return Boolean(data);
}

/** Database-owned publication transaction. No client-facing value picks snapshot fields. */
export async function publishInvitationSnapshot(
  projectId: string,
): Promise<PublishedInvitationSnapshot> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .rpc('publish_invitation_snapshot', { target_project_id: projectId })
    .single();

  if (error) {
    if (error.code === '42501') {
      throw new PublicationAccessDeniedError();
    }

    if (error.code === 'P0001') {
      throw new PublicationPaymentRequiredError();
    }

    if (error.code === '22023') {
      throw new PublicationValidationError();
    }

    throw new PublicationRepositoryError();
  }

  try {
    return mapPublishedSnapshot(data);
  } catch {
    throw new PublicationRepositoryError();
  }
}
