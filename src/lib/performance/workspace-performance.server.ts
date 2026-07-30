import 'server-only';

import { performance } from 'node:perf_hooks';

type WorkspaceServerLoadInput = {
  minimumQueryCount?: number;
  operation: string;
  workspace: string;
};

function getSafeErrorName(error: unknown) {
  return error instanceof Error && /^[A-Za-z0-9_-]{1,80}$/.test(error.name)
    ? error.name
    : 'UnknownError';
}

export async function measureWorkspaceServerLoad<T>(
  input: WorkspaceServerLoadInput,
  operation: () => Promise<T>,
): Promise<T> {
  const startedAt = performance.now();

  try {
    const result = await operation();

    console.info(
      JSON.stringify({
        duration_ms: Math.round(performance.now() - startedAt),
        event: 'workspace_server_load',
        level: 'info',
        ...(input.minimumQueryCount === undefined
          ? {}
          : { minimum_query_count: input.minimumQueryCount }),
        operation: input.operation,
        source: 'workspace-performance',
        status: 'success',
        workspace: input.workspace,
      }),
    );

    return result;
  } catch (error) {
    console.error(
      JSON.stringify({
        duration_ms: Math.round(performance.now() - startedAt),
        error_name: getSafeErrorName(error),
        event: 'workspace_server_load',
        level: 'error',
        ...(input.minimumQueryCount === undefined
          ? {}
          : { minimum_query_count: input.minimumQueryCount }),
        operation: input.operation,
        source: 'workspace-performance',
        status: 'failed',
        workspace: input.workspace,
      }),
    );

    throw error;
  }
}
