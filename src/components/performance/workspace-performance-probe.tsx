'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

import { completeWorkspaceTransition } from '@/lib/performance/workspace-performance.client';

export function WorkspacePerformanceProbe({ workspace }: { workspace: string }) {
  const pathname = usePathname();

  useEffect(() => {
    completeWorkspaceTransition({ pathname, workspace });
  }, [pathname, workspace]);

  return (
    <span
      aria-hidden="true"
      data-workspace-performance-probe
      data-workspace-performance-workspace={workspace}
      hidden
    />
  );
}
