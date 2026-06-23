import {
  parseInvitationDraftDocument,
  type InvitationDraftContent,
} from './invitation-draft.schema';
import type { InvitationDraft } from './invitation-draft.types';

export type InvitationDraftDatabaseRecord = {
  content: unknown;
  created_at: string;
  deleted_at: string | null;
  id: string;
  project_id: string;
  schema_version: number;
  updated_at: string;
};

/** Converts untyped JSONB returned by Supabase into the strict V1 contract. */
export function mapInvitationDraft(record: InvitationDraftDatabaseRecord): InvitationDraft {
  const document = parseInvitationDraftDocument({
    content: record.content,
    schemaVersion: record.schema_version,
  });

  return {
    content: document.content as InvitationDraftContent,
    created_at: record.created_at,
    deleted_at: record.deleted_at,
    id: record.id,
    project_id: record.project_id,
    schema_version: record.schema_version,
    updated_at: record.updated_at,
  };
}
