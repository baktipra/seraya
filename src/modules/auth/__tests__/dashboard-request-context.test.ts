import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

const { cacheMock, getOwnedProjectByIdMock, requireCurrentUserMock, state } = vi.hoisted(() => ({
  cacheMock: vi.fn(),
  getOwnedProjectByIdMock: vi.fn(),
  requireCurrentUserMock: vi.fn(),
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
vi.mock('@/modules/auth/current-user', () => ({ requireCurrentUser: requireCurrentUserMock }));
vi.mock('@/modules/projects/project.repository', () => ({
  getOwnedProjectById: getOwnedProjectByIdMock,
}));

const projectA = {
  account_id: 'owner-a',
  deleted_at: null,
  id: 'project-a',
};
const projectB = {
  account_id: 'owner-a',
  deleted_at: null,
  id: 'project-b',
};

let context: typeof import('../dashboard-request-context');

beforeAll(async () => {
  configureRequestScopedReactCache();
  context = await import('../dashboard-request-context');
});

describe('SRY-021A dashboard request context', () => {
  beforeEach(() => {
    beginFreshRequest();
    getOwnedProjectByIdMock.mockReset();
    requireCurrentUserMock.mockReset().mockResolvedValue({ id: 'owner-a' });
    getOwnedProjectByIdMock.mockImplementation(async (projectId: string, accountId: string) => ({
      ...(projectId === projectA.id ? projectA : projectB),
      account_id: accountId,
      id: projectId,
    }));
  });

  it('deduplicates current user and same-project ownership work inside one simulated RSC request', async () => {
    const [first, second] = await Promise.all([
      context.getOwnedProjectContextForRequest(projectA.id),
      context.getOwnedProjectContextForRequest(projectA.id),
    ]);

    expect(first).toEqual(projectA);
    expect(second).toEqual(projectA);
    expect(requireCurrentUserMock).toHaveBeenCalledTimes(1);
    expect(getOwnedProjectByIdMock).toHaveBeenCalledTimes(1);
    expect(getOwnedProjectByIdMock).toHaveBeenCalledWith(projectA.id, 'owner-a');
  });

  it('keeps different project IDs separate while still reusing the current authenticated user', async () => {
    await expect(context.getOwnedProjectContextForRequest(projectA.id)).resolves.toEqual(projectA);
    await expect(context.getOwnedProjectContextForRequest(projectB.id)).resolves.toEqual(projectB);

    expect(requireCurrentUserMock).toHaveBeenCalledTimes(1);
    expect(getOwnedProjectByIdMock).toHaveBeenCalledTimes(2);
    expect(getOwnedProjectByIdMock).toHaveBeenNthCalledWith(1, projectA.id, 'owner-a');
    expect(getOwnedProjectByIdMock).toHaveBeenNthCalledWith(2, projectB.id, 'owner-a');
  });

  it('does not inherit a user or project context across a fresh simulated request', async () => {
    await context.getOwnedProjectContextForRequest(projectA.id);

    beginFreshRequest();
    requireCurrentUserMock.mockReset().mockResolvedValue({ id: 'owner-b' });
    getOwnedProjectByIdMock.mockReset().mockResolvedValue({
      account_id: 'owner-b',
      deleted_at: null,
      id: projectA.id,
    });

    await expect(context.getOwnedProjectContextForRequest(projectA.id)).resolves.toEqual({
      account_id: 'owner-b',
      deleted_at: null,
      id: projectA.id,
    });

    expect(requireCurrentUserMock).toHaveBeenCalledTimes(1);
    expect(getOwnedProjectByIdMock).toHaveBeenCalledWith(projectA.id, 'owner-b');
  });

  it('preserves generic foreign or soft-deleted project denial from the ownership repository', async () => {
    getOwnedProjectByIdMock.mockRejectedValue(new ProjectAccessDeniedError());

    await expect(
      context.getOwnedProjectContextForRequest('foreign-project'),
    ).rejects.toBeInstanceOf(ProjectAccessDeniedError);
  });
});
