import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  adminFromMock,
  createAdminSupabaseClientMock,
  createServerSupabaseClientMock,
  ownerFromMock,
} = vi.hoisted(() => ({
  adminFromMock: vi.fn(),
  createAdminSupabaseClientMock: vi.fn(),
  createServerSupabaseClientMock: vi.fn(),
  ownerFromMock: vi.fn(),
}));

vi.mock('@/server/supabase/admin', () => ({
  createAdminSupabaseClient: createAdminSupabaseClientMock,
}));
vi.mock('@/server/supabase/server', () => ({
  createServerSupabaseClient: createServerSupabaseClientMock,
}));

import {
  getWeddingReadinessAggregateCountsForVerifiedProject,
  reduceActiveGuestReadinessRows,
  sumConfirmedAttendeeValues,
  WeddingReadinessRepositoryError,
} from '../wedding-readiness.repository';

const project = {
  account_id: '11111111-1111-1111-1111-111111111111',
  default_timezone: 'Asia/Jakarta',
  deleted_at: null,
  event_city: 'Jakarta',
  event_date_primary: '2027-08-17',
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  person_one_name: 'Raka',
  person_two_name: 'Nadia',
  slug: 'raka-nadia',
  status: 'published',
};

type QueryResult = {
  count?: number | null;
  data?: unknown[] | null;
  error: unknown;
};

type QueryDouble = {
  eq: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  range: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  then: (
    onFulfilled?: (value: QueryResult) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ) => Promise<unknown>;
};

function createQuery(result: QueryResult): QueryDouble {
  const query = {
    eq: vi.fn(),
    is: vi.fn(),
    order: vi.fn(),
    range: vi.fn(),
    select: vi.fn(),
    then: (
      onFulfilled?: (value: QueryResult) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(onFulfilled, onRejected),
  } as QueryDouble;

  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.is.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.range.mockReturnValue(query);

  return query;
}

const defaultGuestRows = [
  {
    id: 'guest-1',
    rsvp_attendee_count: 2,
    rsvp_status: 'attending',
    whatsapp_phone_e164: '+628111111111',
  },
  {
    id: 'guest-2',
    rsvp_attendee_count: null,
    rsvp_status: 'pending',
    whatsapp_phone_e164: null,
  },
  {
    id: 'guest-3',
    rsvp_attendee_count: null,
    rsvp_status: 'declined',
    whatsapp_phone_e164: '+628133333333',
  },
  {
    id: 'guest-4',
    rsvp_attendee_count: 3,
    rsvp_status: 'attending',
    whatsapp_phone_e164: null,
  },
];

const defaultLinkRows = [
  {
    created_at: '2026-06-23T00:00:00.000Z',
    guest_id: 'guest-1',
    guests: { whatsapp_phone_e164: '+628111111111' },
    status: 'active',
    token_key_version: 1,
  },
  {
    created_at: '2026-06-22T00:00:00.000Z',
    guest_id: 'guest-2',
    guests: { whatsapp_phone_e164: null },
    status: 'active',
    token_key_version: 1,
  },
  {
    created_at: '2026-06-21T00:00:00.000Z',
    guest_id: 'guest-3',
    guests: { whatsapp_phone_e164: '+628133333333' },
    status: 'revoked',
    token_key_version: null,
  },
];

function setupRepositoryQueries(input?: {
  guestResult?: QueryResult;
  guestbookResult?: QueryResult;
  linkResult?: QueryResult;
}) {
  const ownerQueries = [createQuery(input?.guestResult ?? { data: defaultGuestRows, error: null })];
  const adminQueries = [
    createQuery(input?.linkResult ?? { data: defaultLinkRows, error: null }),
    createQuery(input?.guestbookResult ?? { count: 1, error: null }),
  ];
  const ownerQueryLog = [...ownerQueries];
  const adminQueryLog = [...adminQueries];

  ownerFromMock.mockImplementation(() => ownerQueries.shift());
  adminFromMock.mockImplementation(() => adminQueries.shift());
  createServerSupabaseClientMock.mockResolvedValue({ from: ownerFromMock });
  createAdminSupabaseClientMock.mockReturnValue({ from: adminFromMock });

  return { adminQueries: adminQueryLog, ownerQueries: ownerQueryLog };
}

describe('P0-A4 readiness aggregate repository recovery', () => {
  beforeEach(() => {
    adminFromMock.mockReset();
    createAdminSupabaseClientMock.mockReset();
    createServerSupabaseClientMock.mockReset();
    ownerFromMock.mockReset();
  });

  it('derives guest, RSVP, link, delivery, and Guestbook aggregates from three bounded projections', async () => {
    const { adminQueries, ownerQueries } = setupRepositoryQueries();

    const counts = await getWeddingReadinessAggregateCountsForVerifiedProject(project);

    expect(ownerQueries[0]?.select).toHaveBeenCalledWith(
      'id, whatsapp_phone_e164, rsvp_status, rsvp_attendee_count',
    );
    expect(ownerQueries[0]?.eq).toHaveBeenCalledWith('project_id', project.id);
    expect(ownerQueries[0]?.is).toHaveBeenCalledWith('deleted_at', null);
    expect(ownerQueries[0]?.range).toHaveBeenCalledWith(0, 999);
    expect(adminQueries[0]?.select).toHaveBeenCalledWith(
      'guest_id, status, token_key_version, created_at, guests!inner(project_id, deleted_at, whatsapp_phone_e164)',
    );
    expect(adminQueries[0]?.range).toHaveBeenCalledWith(0, 999);
    expect(adminQueries[1]?.select).toHaveBeenCalledWith(
      'id, guests!inner(project_id, deleted_at)',
      { count: 'exact', head: true },
    );

    expect(counts).toEqual({
      activeGuestCount: 4,
      activeGuestbookCount: 1,
      activePersonalLinkGuestCount: 2,
      attendingCount: 2,
      confirmedAttendeeCount: 5,
      declinedCount: 1,
      needsLinkUpdateCount: 1,
      needsWhatsAppCount: 1,
      noPersonalInvitationCount: 1,
      nonPendingRsvpCount: 3,
      readyToDistributeCount: 1,
      whatsappAvailableCount: 2,
    });
    expect(JSON.stringify(counts)).not.toContain('whatsapp_phone_e164');
  });

  it('keeps confirmed attendee totals safe for null, invalid, negative, non-integer, empty, and non-row values', () => {
    expect(
      sumConfirmedAttendeeValues([
        { rsvp_attendee_count: 2 },
        { rsvp_attendee_count: null },
        { rsvp_attendee_count: Number.NaN },
        { rsvp_attendee_count: -1 },
        { rsvp_attendee_count: 1.25 },
        { rsvp_attendee_count: Number.MAX_SAFE_INTEGER + 1 },
        { party_size: 50 },
        null,
        'not-a-row',
      ]),
    ).toBe(2);
    expect(sumConfirmedAttendeeValues([])).toBe(0);
    expect(sumConfirmedAttendeeValues(null)).toBe(0);
  });

  it('ignores malformed scalar rows without fabricating guest or response facts', () => {
    expect(
      reduceActiveGuestReadinessRows([
        null,
        'not-a-row',
        { rsvp_attendee_count: 2, rsvp_status: 'attending', whatsapp_phone_e164: null },
        { rsvp_attendee_count: -1, rsvp_status: 'attending', whatsapp_phone_e164: '+6281' },
      ]),
    ).toEqual({
      activeGuestCount: 2,
      attendingCount: 2,
      confirmedAttendeeCount: 2,
      declinedCount: 0,
      nonPendingRsvpCount: 2,
      whatsappAvailableCount: 1,
    });
  });

  it('uses one owner projection plus link and Guestbook admin projections for a typical project', async () => {
    setupRepositoryQueries();

    await getWeddingReadinessAggregateCountsForVerifiedProject(project);

    expect(ownerFromMock).toHaveBeenCalledTimes(1);
    expect(adminFromMock).toHaveBeenCalledTimes(2);
    expect(ownerFromMock).toHaveBeenCalledWith('guests');
    expect(adminFromMock).toHaveBeenNthCalledWith(1, 'guest_links');
    expect(adminFromMock).toHaveBeenNthCalledWith(2, 'guestbook_entries');
  });

  it('logs only a stable key plus safe code/message when a scalar projection fails', async () => {
    const error = {
      code: 'PGRST123',
      message:
        'Failed for aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa account 11111111-1111-1111-1111-111111111111 guest bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb guest_name=Raka at https://example.test/g/secret token secret-token-value payment=txn-private guestbook=doa-pribadi and +628123456789.',
    };
    setupRepositoryQueries({ guestResult: { data: null, error } });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(getWeddingReadinessAggregateCountsForVerifiedProject(project)).rejects.toEqual(
      expect.objectContaining({
        message: 'The wedding readiness aggregate could not be loaded.',
        name: 'WeddingReadinessRepositoryError',
      }),
    );

    expect(errorSpy).toHaveBeenCalledWith(
      '[wedding-readiness] query failed',
      expect.objectContaining({
        code: 'PGRST123',
        message: expect.stringContaining('[redacted]'),
        query: 'active_guest_rows',
      }),
    );

    const diagnostic = JSON.stringify(errorSpy.mock.calls);
    expect(diagnostic).not.toContain(project.id);
    expect(diagnostic).not.toContain(project.account_id);
    expect(diagnostic).not.toContain('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
    expect(diagnostic).not.toContain('628123456789');
    expect(diagnostic).not.toContain('Raka');
    expect(diagnostic).not.toContain('secret-token-value');
    expect(diagnostic).not.toContain('txn-private');
    expect(diagnostic).not.toContain('doa-pribadi');
  });

  it('does not silently fall back to fake zero counts when any readiness projection fails', async () => {
    setupRepositoryQueries({
      linkResult: { data: null, error: { code: 'PGRST123', message: 'invalid select' } },
    });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(
      getWeddingReadinessAggregateCountsForVerifiedProject(project),
    ).rejects.toBeInstanceOf(WeddingReadinessRepositoryError);
  });
});
