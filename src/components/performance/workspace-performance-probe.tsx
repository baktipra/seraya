'use client';

import { useEffect } from 'react';

import { completeWorkspaceTransition } from '@/lib/performance/workspace-performance.client';

export function WorkspacePerformanceProbe({ workspace }: { workspace: string }) {
  useEffect(() => {
    completeWorkspaceTransition({ pathname: window.location.pathname, workspace });
  }, [workspace]);

  return (
    <span
      aria-hidden="true"
      data-workspace-performance-probe
      data-workspace-performance-workspace={workspace}
      hidden
    />
  );
}
