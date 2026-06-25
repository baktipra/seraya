import type { InvitationTemplateKey } from '@/modules/invitation-templates/invitation-template.keys';
import type { InvitationDraftContent } from '@/modules/invitations/invitation-draft.schema';

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
  template_id: InvitationTemplateKey;
};

export function getPublishedInvitationCacheTag(slug: string) {
  return `published-invitation:${slug}`;
}
