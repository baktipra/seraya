import { describe, expect, it } from 'vitest';

import { createDefaultInvitationDraftContent } from '@/modules/invitations/invitation-draft.defaults';

import {
  normalizePublishedInvitationSnapshot,
  normalizePublishedInvitationSnapshotRecord,
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

  it('resolves legacy published snapshot drafts without templateKey to Roselle', () => {
    const payload = createPayload();
    delete (payload.draft as Partial<typeof payload.draft>).templateKey;

    expect(parsePublishedInvitationSnapshot(payload).draft.templateKey).toBe('roselle');
  });

  it('normalizes a legacy published snapshot without eventSchedule to one derived event', () => {
    const payload = createPayload();
    payload.draft.events = {
      ceremony: {
        date: '2027-08-17',
        enabled: true,
        endTime: '10:00',
        startTime: '08:00',
        title: 'Akad Nikah',
      },
      enabled: true,
      primaryDate: '2027-08-17',
      reception: { date: null, enabled: false, endTime: null, startTime: null, title: null },
    };
    payload.draft.location = {
      address: 'Jalan Mawar 1',
      enabled: true,
      mapsUrl: 'https://maps.example.test/akad',
      venueName: 'Masjid Seraya',
    };
    delete (payload.draft as Partial<typeof payload.draft>).eventSchedule;

    expect(parsePublishedInvitationSnapshot(payload).draft.eventSchedule.events).toEqual([
      expect.objectContaining({
        date: '2027-08-17',
        endTime: '10:00',
        mapsUrl: 'https://maps.example.test/akad',
        startTime: '08:00',
        title: 'Akad Nikah',
        venueAddress: 'Jalan Mawar 1',
        venueName: 'Masjid Seraya',
      }),
    ]);
  });

  it('resolves legacy published snapshot drafts without digitalGift to the disabled state', () => {
    const payload = createPayload();
    delete (payload.draft as Partial<typeof payload.draft>).digitalGift;

    expect(parsePublishedInvitationSnapshot(payload).draft.digitalGift).toEqual({
      accounts: [],
      enabled: false,
      heading: null,
      lead: null,
    });
  });

  it('normalizes only an absent legacy digitalGift field and rejects malformed present data', () => {
    const legacyPayload = createPayload();
    delete (legacyPayload.draft as Partial<typeof legacyPayload.draft>).digitalGift;

    expect(normalizePublishedInvitationSnapshot(legacyPayload)?.draft.digitalGift).toEqual({
      accounts: [],
      enabled: false,
      heading: null,
      lead: null,
    });

    expect(
      normalizePublishedInvitationSnapshot({
        ...createPayload(),
        draft: {
          ...createPayload().draft,
          digitalGift: { accounts: [], enabled: true, heading: null, lead: null },
        },
      }),
    ).toBeNull();
  });

  it('normalizes legacy full snapshot records without digitalGift', () => {
    const payload = createPayload();
    delete (payload.draft as Partial<typeof payload.draft>).digitalGift;

    expect(
      normalizePublishedInvitationSnapshotRecord({
        created_at: '2026-06-20T00:00:00.000Z',
        draft_schema_version: 1,
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        is_current: true,
        project_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        published_at: '2026-06-20T00:00:00.000Z',
        revision: 1,
        slug: 'raka-nadia',
        snapshot: payload,
        template_id: 'roselle',
      })?.snapshot.draft.digitalGift,
    ).toEqual({
      accounts: [],
      enabled: false,
      heading: null,
      lead: null,
    });
  });

  it('accepts each supported immutable snapshot template id', () => {
    for (const templateId of ['roselle', 'aruna', 'laras'] as const) {
      expect(
        parsePublishedInvitationSnapshotRecord({
          created_at: '2026-06-20T00:00:00.000Z',
          draft_schema_version: 1,
          id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          is_current: true,
          project_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          published_at: '2026-06-20T00:00:00.000Z',
          revision: 1,
          slug: 'raka-nadia',
          snapshot: {
            ...createPayload(),
            draft: { ...createPayload().draft, templateKey: templateId },
          },
          template_id: templateId,
        }).template_id,
      ).toBe(templateId);
    }
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
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        is_current: true,
        project_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        published_at: '2026-06-20T00:00:00.000Z',
        revision: 1,
        slug: 'raka-nadia',
        snapshot: createPayload(),
        template_id: 'roselle',
      }),
    ).toThrow();
  });
});
