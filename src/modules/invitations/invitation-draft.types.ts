import type { InvitationDraftContent } from './invitation-draft.schema';

export type InvitationDraft = {
  content: InvitationDraftContent;
  created_at: string;
  deleted_at: string | null;
  id: string;
  project_id: string;
  schema_version: number;
  updated_at: string;
};
