import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultInvitationDraftContent } from '@/modules/invitations/invitation-draft.defaults';

const { createPublicSupabaseClientMock, unstableCacheMock } = vi.hoisted(() => ({
  createPublicSupabaseClientMock: vi.fn(),
  unstableCacheMock: vi.fn(),
}));

vi.mock('next/cache', () => ({ unstable_cache: unstableCacheMock }));
vi.mock('@/server/supabase/public', () => ({
  createPublicSupabaseClient: createPublicSupabaseClientMock,
}));

import { getCachedCurrentPublishedInvitationBySlug } from '../public-invitation.repository';

const project = {
  default_timezone: 'Asia/Jakarta',
  event_date_primary: '2027-08-17',
  person_one_name: 'Raka',
  person_two_name: 'Nadia',
};

function createPublicRecord() {
  return {
    created_at: '2026-06-20T00:00:00.000Z',
    draft_schema_version: 1,
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    is_current: true,
    project_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    published_at: '2026-06-20T00:00:00.000Z',
    revision: 1,
    slug: 'raka-nadia',
    snapshot: {
      draft: createDefaultInvitationDraftContent(project),
      project: {
        eventCity: 'Jakarta',
        eventDatePrimary: '2027-08-17',
        slug: 'raka-nadia',
        timezone: 'Asia/Jakarta',
      },
    },
    template_id: 'roselle' as const,
  };
}

describe('public invitation cache compatibility boundary', () => {
  beforeEach(() => {
    createPublicSupabaseClientMock.mockReset();
    unstableCacheMock.mockReset();
  });

  it('normalizes a legacy cache hit without digitalGift after cache retrieval', async () => {
    const legacyRecord = createPublicRecord();
    delete (legacyRecord.snapshot.draft as Partial<typeof legacyRecord.snapshot.draft>).digitalGift;

    unstableCacheMock.mockImplementation(() => async () => legacyRecord);

    const result = await getCachedCurrentPublishedInvitationBySlug('raka-nadia');

    expect(createPublicSupabaseClientMock).not.toHaveBeenCalled();
    expect(unstableCacheMock).toHaveBeenCalledWith(
      expect.any(Function),
      ['published-invitation-v2', 'raka-nadia'],
      {
        revalidate: 3600,
        tags: ['published-invitation:raka-nadia'],
      },
    );
    expect(result?.snapshot.draft.digitalGift).toEqual({
      accounts: [],
      enabled: false,
      heading: null,
      lead: null,
    });
  });

  it('normalizes a legacy cache payload without eventSchedule after the cache retrieval boundary', async () => {
    const legacyRecord = createPublicRecord();
    legacyRecord.snapshot.draft.events = {
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
    legacyRecord.snapshot.draft.location = {
      address: 'Jalan Mawar 1',
      enabled: true,
      mapsUrl: 'https://maps.example.test/akad',
      venueName: 'Masjid Seraya',
    };
    delete (legacyRecord.snapshot.draft as Partial<typeof legacyRecord.snapshot.draft>)
      .eventSchedule;

    unstableCacheMock.mockImplementation(() => async () => legacyRecord);

    const result = await getCachedCurrentPublishedInvitationBySlug('raka-nadia');

    expect(result?.snapshot.draft.eventSchedule.events).toEqual([
      expect.objectContaining({
        mapsUrl: 'https://maps.example.test/akad',
        title: 'Akad Nikah',
        venueName: 'Masjid Seraya',
      }),
    ]);
  });

  it('preserves modern enabled Amplop Digital account order from a cache hit', async () => {
    const modernRecord = createPublicRecord();
    modernRecord.snapshot.draft.digitalGift = {
      accounts: [
        {
          accountHolder: 'Raka Pratama',
          accountNumber: '123456789012',
          id: '11111111-1111-4111-8111-111111111111',
          providerName: 'Bank Seraya',
        },
        {
          accountHolder: 'Nadia Putri',
          accountNumber: '987654321098',
          id: '22222222-2222-4222-8222-222222222222',
          providerName: 'E-wallet Seraya',
        },
      ],
      enabled: true,
      heading: 'Amplop Digital',
      lead: 'Terima kasih atas doa terbaik Anda.',
    };

    unstableCacheMock.mockImplementation(() => async () => modernRecord);

    const result = await getCachedCurrentPublishedInvitationBySlug('raka-nadia');

    expect(result?.snapshot.draft.digitalGift).toEqual(modernRecord.snapshot.draft.digitalGift);
  });

  it('keeps malformed present digitalGift data on the existing invalid-snapshot path', async () => {
    const malformedRecord = createPublicRecord();
    malformedRecord.snapshot.draft.digitalGift = {
      accounts: [],
      enabled: true,
      heading: null,
      lead: null,
    };

    unstableCacheMock.mockImplementation(() => async () => malformedRecord);

    await expect(getCachedCurrentPublishedInvitationBySlug('raka-nadia')).resolves.toBeNull();
  });
});
