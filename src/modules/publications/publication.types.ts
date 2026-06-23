import type { InvitationDraftContent } from '@/modules/invitations/invitation-draft.schema';

export const ROSELLE_PUBLISHED_TEMPLATE_ID = 'roselle' as const;

export type PublishedInvitationProjectSnapshot = {
  eventCity: string;
  eventDatePrimary: string;
  slug: string;
  timezone: string;
};

export type PublishedInvitationSnapshotPayload = {
  draft: InvitationDraftContent;
  project: PublishedInvitationProjectSnapshot;
};

export type PublishedInvitationSnapshot = {
  created_at: string;
  draft_schema_version: number;
  id: string;
  is_current: boolean;
  project_id: string;
  published_at: string;
  revision: number;
  slug: string;
  snapshot: PublishedInvitationSnapshotPayload;
  template_id: typeof ROSELLE_PUBLISHED_TEMPLATE_ID;
};

export function getPublishedInvitationCacheTag(slug: string) {
  return `published-invitation:${slug}`;
}
