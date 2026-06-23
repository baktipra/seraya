import 'server-only';

export type ProjectOwnershipCandidate = {
  account_id: string;
  deleted_at: string | null;
};

export class ProjectAccessDeniedError extends Error {
  constructor() {
    super('Project was not found or is not accessible by the current account.');
    this.name = 'ProjectAccessDeniedError';
  }
}

/**
 * A defense-in-depth guard for server-owned actions. Database RLS remains authoritative.
 */
export function assertProjectOwnership<T extends ProjectOwnershipCandidate>(
  project: T | null,
  accountId: string,
): T {
  if (!project || project.account_id !== accountId || project.deleted_at !== null) {
    throw new ProjectAccessDeniedError();
  }

  return project;
}
