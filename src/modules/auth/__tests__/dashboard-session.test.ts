import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  cacheMock,
  createServerSupabaseClientMock,
  getCurrentDashboardUserForRequestMock,
  listOwnedActiveProjectsMock,
  state,
} = vi.hoisted(() => ({
  cacheMock: vi.fn(),
  createServerSupabaseClientMock: vi.fn(),
  getCurrentDashboardUserForRequestMock: vi.fn(),
  listOwnedActiveProjectsMock: vi.fn(),
  state: {
    nextFunctionId: 0,
    requestEntries: new Map<string, unknown>(),
  },
}));

function configureRequestScopedReactCache() {
  cacheMock.mockImplementation((fn: (...args: unknown[]) => unknown) => {
    const functionId = state.nextFunctionId++;

    return (...args: unknown[]) => {
      const key = `${functionId}:${JSON.stringify(args)}`;

      if (!state.requestEntries.has(key)) {
        state.requestEntries.set(key, fn(...args));
      }

      return state.requestEntries.get(key);
    };
  });
}

function beginFreshRequest() {
  state.requestEntries.clear();
}

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return { ...actual, cache: cacheMock };
});
vi.mock('@/modules/auth/dashboard-request-context', () => ({
  getCurrentDashboardUserForRequest: getCurrentDashboardUserForRequestMock,
}));
vi.mock('@/server/supabase/server', () => ({
  createServerSupabaseClient: createServerSupabaseClientMock,
}));
vi.mock('@/modules/projects/project.repository', () => ({
  listOwnedActiveProjects: listOwnedActiveProjectsMock,
}));

function createProfileClient() {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: { display_name: 'Raka', email: 'raka@example.test' },
    error: null,
  });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });

  return { client: { from }, from, maybeSingle };
}

let session: typeof import('../dashboard-session');

beforeAll(async () => {
  configureRequestScopedReactCache();
  session = await import('../dashboard-session');
});

describe('SRY-021A dashboard session request context', () => {
  beforeEach(() => {
    beginFreshRequest();
    createServerSupabaseClientMock.mockReset();
    getCurrentDashboardUserForRequestMock.mockReset().mockResolvedValue({
      email: 'raka@example.test',
      id: 'owner-a',
      user_metadata: {},
    });
    listOwnedActiveProjectsMock.mockReset().mockResolvedValue([]);
  });

  it('loads profile and active projects once when dashboard layout and page read the same request context', async () => {
    const profileClient = createProfileClient();
    createServerSupabaseClientMock.mockResolvedValue(profileClient.client);

    const [layoutContext, pageContext] = await Promise.all([
      session.getDashboardSessionContextForRequest(),
      session.getDashboardSessionContextForRequest(),
    ]);

    expect(layoutContext).toEqual(pageContext);
    expect(getCurrentDashboardUserForRequestMock).toHaveBeenCalledTimes(1);
    expect(createServerSupabaseClientMock).toHaveBeenCalledTimes(1);
    expect(profileClient.from).toHaveBeenCalledTimes(1);
    expect(profileClient.maybeSingle).toHaveBeenCalledTimes(1);
    expect(listOwnedActiveProjectsMock).toHaveBeenCalledTimes(1);
    expect(listOwnedActiveProjectsMock).toHaveBeenCalledWith('owner-a');
  });

  it('starts a new profile and project-list load for a fresh simulated request', async () => {
    const firstClient = createProfileClient();
    createServerSupabaseClientMock.mockResolvedValue(firstClient.client);
    await session.getDashboardSessionContextForRequest();

    beginFreshRequest();
    createServerSupabaseClientMock.mockReset();
    getCurrentDashboardUserForRequestMock.mockReset().mockResolvedValue({
      email: 'nadia@example.test',
      id: 'owner-b',
      user_metadata: {},
    });
    listOwnedActiveProjectsMock.mockReset().mockResolvedValue([]);
    const secondClient = createProfileClient();
    createServerSupabaseClientMock.mockResolvedValue(secondClient.client);

    await session.getDashboardSessionContextForRequest();

    expect(getCurrentDashboardUserForRequestMock).toHaveBeenCalledTimes(1);
    expect(createServerSupabaseClientMock).toHaveBeenCalledTimes(1);
    expect(listOwnedActiveProjectsMock).toHaveBeenCalledWith('owner-b');
    expect(secondClient.maybeSingle).toHaveBeenCalledTimes(1);
  });
});
