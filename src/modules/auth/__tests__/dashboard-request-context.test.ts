import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthenticationRequiredError } from '@/modules/auth/current-user';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

const { cacheMock, createServerSupabaseClientMock, getOwnedProjectByIdMock, state } = vi.hoisted(
  () => ({
    cacheMock: vi.fn(),
    createServerSupabaseClientMock: vi.fn(),
    getOwnedProjectByIdMock: vi.fn(),
    state: {
      nextFunctionId: 0,
      requestEntries: new Map<string, unknown>(),
    },
  }),
);

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
vi.mock('@/server/supabase/server', () => ({
  createServerSupabaseClient: createServerSupabaseClientMock,
}));
vi.mock('@/modules/projects/project.repository', () => ({
  getOwnedProjectById: getOwnedProjectByIdMock,
}));

const ownerA = '11111111-1111-1111-1111-111111111111';
const ownerB = '22222222-2222-2222-2222-222222222222';

const projectA = {
  account_id: ownerA,
  deleted_at: null,
  id: 'project-a',
};
const projectB = {
  account_id: ownerA,
  deleted_at: null,
  id: 'project-b',
};

type ClaimsResult = {
  data: { claims: unknown } | null;
  error: Error | null;
};

function installClaimsClient(result: ClaimsResult) {
  const getClaims = vi.fn().mockResolvedValue(result);
  const getSession = vi.fn();
  const getUser = vi.fn();

  createServerSupabaseClientMock.mockResolvedValue({
    auth: { getClaims, getSession, getUser },
  });

  return { getClaims, getSession, getUser };
}

function validClaims(subject = ownerA): ClaimsResult {
  return { data: { claims: { sub: subject } }, error: null };
}

let context: typeof import('../dashboard-request-context');

beforeAll(async () => {
  configureRequestScopedReactCache();
  context = await import('../dashboard-request-context');
});

describe('SRY-024 dashboard request context verified claims', () => {
  beforeEach(() => {
    beginFreshRequest();
    createServerSupabaseClientMock.mockReset();
    getOwnedProjectByIdMock.mockReset();
    installClaimsClient(validClaims());
    getOwnedProjectByIdMock.mockImplementation(async (projectId: string, accountId: string) => ({
      ...(projectId === projectA.id ? projectA : projectB),
      account_id: accountId,
      id: projectId,
    }));
  });

  it('derives the minimal dashboard identity from verified claims without getUser or getSession', async () => {
    const client = installClaimsClient(validClaims());

    await expect(context.getCurrentDashboardUserForRequest()).resolves.toEqual({ id: ownerA });

    expect(client.getClaims).toHaveBeenCalledTimes(1);
    expect(client.getUser).not.toHaveBeenCalled();
    expect(client.getSession).not.toHaveBeenCalled();
  });

  it('deduplicates claims identity and same-project ownership work inside one simulated RSC request', async () => {
    const client = installClaimsClient(validClaims());

    const [first, second] = await Promise.all([
      context.getOwnedProjectContextForRequest(projectA.id),
      context.getOwnedProjectContextForRequest(projectA.id),
    ]);

    expect(first).toEqual(projectA);
    expect(second).toEqual(projectA);
    expect(client.getClaims).toHaveBeenCalledTimes(1);
    expect(getOwnedProjectByIdMock).toHaveBeenCalledTimes(1);
    expect(getOwnedProjectByIdMock).toHaveBeenCalledWith(projectA.id, ownerA);
  });

  it('keeps different project IDs separate while still reusing one verified claims identity', async () => {
    const client = installClaimsClient(validClaims());

    await expect(context.getOwnedProjectContextForRequest(projectA.id)).resolves.toEqual(projectA);
    await expect(context.getOwnedProjectContextForRequest(projectB.id)).resolves.toEqual(projectB);

    expect(client.getClaims).toHaveBeenCalledTimes(1);
    expect(getOwnedProjectByIdMock).toHaveBeenCalledTimes(2);
    expect(getOwnedProjectByIdMock).toHaveBeenNthCalledWith(1, projectA.id, ownerA);
    expect(getOwnedProjectByIdMock).toHaveBeenNthCalledWith(2, projectB.id, ownerA);
  });

  it('does not inherit claims identity or project context across a fresh simulated request', async () => {
    const firstClient = installClaimsClient(validClaims(ownerA));
    await context.getOwnedProjectContextForRequest(projectA.id);

    beginFreshRequest();
    createServerSupabaseClientMock.mockReset();
    getOwnedProjectByIdMock.mockReset().mockResolvedValue({
      account_id: ownerB,
      deleted_at: null,
      id: projectA.id,
    });
    const secondClient = installClaimsClient(validClaims(ownerB));

    await expect(context.getOwnedProjectContextForRequest(projectA.id)).resolves.toEqual({
      account_id: ownerB,
      deleted_at: null,
      id: projectA.id,
    });

    expect(firstClient.getClaims).toHaveBeenCalledTimes(1);
    expect(secondClient.getClaims).toHaveBeenCalledTimes(1);
    expect(getOwnedProjectByIdMock).toHaveBeenCalledWith(projectA.id, ownerB);
  });

  it.each([
    ['claims error', { data: null, error: new Error('claims unavailable') }],
    ['missing claims', { data: null, error: null }],
    ['missing claims subject', { data: { claims: {} }, error: null }],
    ['malformed claims subject', { data: { claims: { sub: 'owner-a' } }, error: null }],
  ] as const)('fails closed for %s without attempting owner lookup', async (_scenario, result) => {
    const client = installClaimsClient(result);

    await expect(context.getCurrentDashboardUserForRequest()).rejects.toBeInstanceOf(
      AuthenticationRequiredError,
    );

    expect(client.getClaims).toHaveBeenCalledTimes(1);
    expect(client.getUser).not.toHaveBeenCalled();
    expect(client.getSession).not.toHaveBeenCalled();
    expect(getOwnedProjectByIdMock).not.toHaveBeenCalled();
  });

  it('fails closed when claims verification throws without exposing provider details', async () => {
    const getClaims = vi.fn().mockRejectedValue(new Error('provider unavailable'));
    const getSession = vi.fn();
    const getUser = vi.fn();
    createServerSupabaseClientMock.mockResolvedValue({
      auth: { getClaims, getSession, getUser },
    });

    await expect(context.getCurrentDashboardUserForRequest()).rejects.toBeInstanceOf(
      AuthenticationRequiredError,
    );

    expect(getClaims).toHaveBeenCalledTimes(1);
    expect(getUser).not.toHaveBeenCalled();
    expect(getSession).not.toHaveBeenCalled();
    expect(getOwnedProjectByIdMock).not.toHaveBeenCalled();
  });

  it('preserves generic foreign or soft-deleted project denial from the ownership repository', async () => {
    getOwnedProjectByIdMock.mockRejectedValue(new ProjectAccessDeniedError());

    await expect(
      context.getOwnedProjectContextForRequest('foreign-project'),
    ).rejects.toBeInstanceOf(ProjectAccessDeniedError);
  });
});
