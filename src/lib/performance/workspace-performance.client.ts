'use client';

const pendingTransitionKey = 'seraya:workspace-transition:v1';

type PendingWorkspaceTransition = {
  from: string;
  navigationId: string;
  startedAt: number;
  startedEpochMs: number;
  timeOrigin: number;
  to: string;
  workspace: string;
};

type WorkspaceTransitionInput = {
  from: string;
  to: string;
  workspace: string;
};

type WorkspaceReadyInput = {
  pathname: string;
  workspace: string;
};

function createNavigationId() {
  return (
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

function normalizeWorkspacePath(pathname: string) {
  return pathname.replace(/^\/dashboard\/[^/]+/, '/dashboard/:projectId');
}

function writePendingTransition(pending: PendingWorkspaceTransition) {
  try {
    window.sessionStorage.setItem(pendingTransitionKey, JSON.stringify(pending));
    return true;
  } catch {
    return false;
  }
}

function readPendingTransition(): PendingWorkspaceTransition | null {
  try {
    const raw = window.sessionStorage.getItem(pendingTransitionKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<PendingWorkspaceTransition>;
    if (
      typeof parsed.from !== 'string' ||
      typeof parsed.navigationId !== 'string' ||
      typeof parsed.startedAt !== 'number' ||
      typeof parsed.startedEpochMs !== 'number' ||
      typeof parsed.timeOrigin !== 'number' ||
      typeof parsed.to !== 'string' ||
      typeof parsed.workspace !== 'string'
    ) {
      window.sessionStorage.removeItem(pendingTransitionKey);
      return null;
    }

    return parsed as PendingWorkspaceTransition;
  } catch {
    try {
      window.sessionStorage.removeItem(pendingTransitionKey);
    } catch {
      // Metrics must never interfere with workspace navigation.
    }
    return null;
  }
}

function clearPendingTransition() {
  try {
    window.sessionStorage.removeItem(pendingTransitionKey);
  } catch {
    // Metrics must never interfere with workspace navigation.
  }
}

function getRscResources(startedAt: number) {
  return (performance.getEntriesByType('resource') as PerformanceResourceTiming[])
    .filter((entry) => entry.startTime >= Math.max(0, startedAt - 2))
    .filter((entry) => entry.name.includes('_rsc='));
}

function logMetric(payload: Record<string, unknown>) {
  console.info(
    JSON.stringify({
      level: 'info',
      source: 'workspace-performance',
      ...payload,
    }),
  );
}

export function beginWorkspaceTransition(input: WorkspaceTransitionInput) {
  if (typeof window === 'undefined' || input.from === input.to) return;

  const pending: PendingWorkspaceTransition = {
    ...input,
    navigationId: createNavigationId(),
    startedAt: performance.now(),
    startedEpochMs: Date.now(),
    timeOrigin: performance.timeOrigin,
  };

  if (!writePendingTransition(pending)) return;

  performance.clearMarks('seraya:workspace-transition:start');
  performance.mark('seraya:workspace-transition:start');

  logMetric({
    event: 'workspace_transition_started',
    from: normalizeWorkspacePath(input.from),
    navigation_id: pending.navigationId,
    to: normalizeWorkspacePath(input.to),
    workspace: input.workspace,
  });
}

export function completeWorkspaceTransition(input: WorkspaceReadyInput) {
  if (typeof window === 'undefined') return;

  const pending = readPendingTransition();
  if (!pending || pending.to !== input.pathname) return;

  window.requestAnimationFrame(() => {
    const sameDocument = Math.abs(pending.timeOrigin - performance.timeOrigin) < 1;
    const totalMs = sameDocument
      ? performance.now() - pending.startedAt
      : Date.now() - pending.startedEpochMs;
    const resources = sameDocument ? getRscResources(pending.startedAt) : [];
    const rscDurationMs = resources.reduce((total, resource) => total + resource.duration, 0);
    const rscTransferBytes = resources.reduce(
      (total, resource) => total + (resource.transferSize || resource.encodedBodySize || 0),
      0,
    );

    performance.clearMarks('seraya:workspace-transition:ready');
    performance.mark('seraya:workspace-transition:ready');

    const metric = {
      event: 'workspace_transition_ready',
      from: normalizeWorkspacePath(pending.from),
      navigation_id: pending.navigationId,
      navigation_mode: sameDocument ? 'client' : 'document',
      rsc_duration_ms: Math.round(rscDurationMs),
      rsc_request_count: resources.length,
      rsc_transfer_bytes: rscTransferBytes,
      to: normalizeWorkspacePath(pending.to),
      total_ms: Math.round(totalMs),
      workspace: input.workspace,
    };

    logMetric(metric);
    window.dispatchEvent(new CustomEvent('seraya:workspace-performance', { detail: metric }));
    clearPendingTransition();
  });
}
