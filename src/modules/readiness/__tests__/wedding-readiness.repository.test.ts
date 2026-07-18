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
  data?: unknown;
  error: unknown;
};

type QueryDouble = {
  eq: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  neq: ReturnType<typeof vi.fn>;
  not: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
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
    neq: vi.fn(),
    not: vi.fn(),
    order: vi.fn(),
    select: vi.fn(),
    then: (
      onFulfilled?: (value: QueryResult) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(onFulfilled, onRejected),
  } as QueryDouble;

  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.is.mockReturnValue(query);
  query.neq.mockReturnValue(query);
  query.not.mockReturnValue(query);
  query.order.mockReturnValue(query);

  return query;
}

function setupRepositoryQueries(overrides: Partial<QueryResult> = {}) {
  const ownerQueries = [
    createQuery({ count: 4, error: null }),
    createQuery({ count: 2, error: null }),
    createQuery({ count: 2, error: null }),
    createQuery({ count: 2, error: null }),
    createQuery({ count: 0, error: null }),
    createQuery({
      data: [
        { rsvp_attendee_count: 2 },
        { rsvp_attendee_count: null },
        { rsvp_attendee_count: -1 },
        { rsvp_attendee_count: 1.5 },
        { party_size: 99, rsvp_attendee_count: 3 },
        { rsvp_attendee_count: Number.NaN },
        { rsvp_attendee_count: 0 },
      ],
      error: null,
      ...overrides,
    }),
  ];
  const adminQueries = [
    createQuery({ count: 3, error: null }),
    createQuery({ count: 1, error: null }),
    createQuery({ data: [], error: null }),
  ];

  const ownerQueryLog = [...ownerQueries];
  const adminQueryLog = [...adminQueries];

  ownerFromMock.mockImplementation(() => ownerQueries.shift());
  adminFromMock.mockImplementation(() => adminQueries.shift());
  createServerSupabaseClientMock.mockResolvedValue({ from: ownerFromMock });
  createAdminSupabaseClientMock.mockReturnValue({ from: adminFromMock });

  return { adminQueries: adminQueryLog, ownerQueries: ownerQueryLog };
}

describe('SRY-031 readiness aggregate repository compatibility repair', () => {
  beforeEach(() => {
    adminFromMock.mockReset();
    createAdminSupabaseClientMock.mockReset();
    createServerSupabaseClientMock.mockReset();
    ownerFromMock.mockReset();
  });

  it('queries only scalar attendee values with the owner-scoped active attending filters and sums them server-side', async () => {
    const { ownerQueries } = setupRepositoryQueries();

    const counts = await getWeddingReadinessAggregateCountsForVerifiedProject(project);
    const confirmedAttendeeQuery = ownerQueries[5];

    expect(confirmedAttendeeQuery?.select).toHaveBeenCalledWith('rsvp_attendee_count');
    expect(confirmedAttendeeQuery?.eq).toHaveBeenCalledWith('project_id', project.id);
    expect(confirmedAttendeeQuery?.eq).toHaveBeenCalledWith('rsvp_status', 'attending');
    expect(confirmedAttendeeQuery?.is).toHaveBeenCalledWith('deleted_at', null);
    expect(confirmedAttendeeQuery?.not).toHaveBeenCalledWith('rsvp_attendee_count', 'is', null);
    expect(counts.confirmedAttendeeCount).toBe(5);
    expect(counts).not.toHaveProperty('confirmedAttendeeValues');
    expect(JSON.stringify(counts)).not.toContain('party_size');
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

  it('runs all owner and admin readiness queries in the same aggregate group rather than loading guest records', async () => {
    setupRepositoryQueries();

    await getWeddingReadinessAggregateCountsForVerifiedProject(project);

    expect(ownerFromMock).toHaveBeenCalledTimes(6);
    expect(adminFromMock).toHaveBeenCalledTimes(3);
    expect(ownerFromMock).toHaveBeenNthCalledWith(6, 'guests');
    expect(adminFromMock).toHaveBeenNthCalledWith(1, 'guest_links');
    expect(adminFromMock).toHaveBeenNthCalledWith(2, 'guestbook_entries');
    expect(adminFromMock).toHaveBeenNthCalledWith(3, 'guest_links');
  });

  it('logs only a stable key plus safe code/message when attendee scalar loading fails, then keeps the browser error generic', async () => {
    const error = {
      code: 'PGRST123',
      message:
        'Failed for aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa account 11111111-1111-1111-1111-111111111111 guest bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb guest_name=Raka at https://example.test/g/secret token secret-token-value payment=txn-private guestbook=doa-pribadi and +628123456789.',
    };
    setupRepositoryQueries({ data: null, error });
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
        query: 'confirmed_attendee_values',
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

  it('does not silently fall back to fake zero counts when any readiness query fails', async () => {
    setupRepositoryQueries({ data: null, error: { code: 'PGRST123', message: 'invalid select' } });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(
      getWeddingReadinessAggregateCountsForVerifiedProject(project),
    ).rejects.toBeInstanceOf(WeddingReadinessRepositoryError);
  });
});
