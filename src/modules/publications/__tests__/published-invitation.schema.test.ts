import { describe, expect, it } from 'vitest';

import { createDefaultInvitationDraftContent } from '@/modules/invitations/invitation-draft.defaults';

import {
  parsePublishedInvitationSnapshot,
  parsePublishedInvitationSnapshotRecord,
} from '../published-invitation.schema';

const project = {
  default_timezone: 'Asia/Jakarta',
  event_date_primary: '2027-08-17',
  person_one_name: 'Raka',
  person_two_name: 'Nadia',
};

function createPayload() {
  return {
    draft: createDefaultInvitationDraftContent(project),
    project: {
      eventCity: 'Jakarta',
      eventDatePrimary: '2027-08-17',
      slug: 'raka-nadia',
      timezone: 'Asia/Jakarta',
    },
  };
}

describe('published invitation snapshot contract', () => {
  it('accepts only the rendering payload copied from a validated V1 draft', () => {
    expect(parsePublishedInvitationSnapshot(createPayload())).toMatchObject({
      project: { slug: 'raka-nadia' },
    });
  });

  it('rejects internal metadata, unsupported schema versions, and invalid public project data', () => {
    expect(() =>
      parsePublishedInvitationSnapshot({
        ...createPayload(),
        account_id: 'private-account-id',
      }),
    ).toThrow();

    expect(() =>
      parsePublishedInvitationSnapshot({
        ...createPayload(),
        project: { ...createPayload().project, eventDatePrimary: '17-08-2027' },
      }),
    ).toThrow();

    expect(() =>
      parsePublishedInvitationSnapshotRecord({
        created_at: '2026-06-20T00:00:00.000Z',
        draft_schema_version: 2,
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        is_current: true,
        project_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        published_at: '2026-06-20T00:00:00.000Z',
        revision: 1,
        slug: 'raka-nadia',
        snapshot: createPayload(),
        template_id: 'roselle',
      }),
    ).toThrow();
  });
});
