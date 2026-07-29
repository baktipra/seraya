import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

const navigation = read('src/components/dashboard/project-navigation.tsx');
const workspacePage = read('src/components/workspace/workspace-page.tsx');
const clientMetrics = read('src/lib/performance/workspace-performance.client.ts');
const serverMetrics = read('src/lib/performance/workspace-performance.server.ts');
const readinessRepository = read('src/modules/readiness/wedding-readiness.repository.ts');
const packageJson = read('package.json');

const routeContracts = [
  ['src/app/(dashboard)/dashboard/[projectId]/layout.tsx', 'project-shell-readiness'],
  ['src/app/(dashboard)/dashboard/[projectId]/page.tsx', 'overview-readiness'],
  ['src/app/(dashboard)/dashboard/[projectId]/invitation/page.tsx', 'invitation-editor-screen'],
  ['src/app/(dashboard)/dashboard/[projectId]/guests/page.tsx', 'guest-manager-screen'],
  ['src/app/(dashboard)/dashboard/[projectId]/delivery/page.tsx', 'delivery-center-screen'],
  ['src/app/(dashboard)/dashboard/[projectId]/rsvp/page.tsx', 'guest-response-screen'],
] as const;

describe('P0-A1 workspace performance instrumentation contract', () => {
  it('measures a canonical navigation from click through rendered workspace readiness', () => {
    expect(navigation).toContain('beginWorkspaceTransition');
    expect(navigation.match(/performanceWorkspace: '[^']+'/g)).toHaveLength(5);
    expect(workspacePage).toContain('WorkspacePerformanceProbe');
    expect(clientMetrics).toContain("event: 'workspace_transition_started'");
    expect(clientMetrics).toContain("event: 'workspace_transition_ready'");
    expect(clientMetrics).toContain('rsc_transfer_bytes');
    expect(clientMetrics).toContain('total_ms');
  });

  it('keeps A1 observational and preserves the known prefetch-off baseline', () => {
    expect(navigation).toContain('prefetch={false}');
    expect(navigation).not.toContain('router.prefetch');
  });

  it('records safe structured server timing for every canonical workspace loader', () => {
    expect(serverMetrics).toContain("source: 'workspace-performance'");
    expect(serverMetrics).toContain("event: 'workspace_server_load'");
    expect(serverMetrics).not.toContain('projectId');

    for (const [path, operation] of routeContracts) {
      const source = read(path);
      expect(source).toContain('measureWorkspaceServerLoad');
      expect(source).toContain(`operation: '${operation}'`);
    }
  });

  it('records the current nine-query readiness batch without changing its semantics', () => {
    expect(readinessRepository.match(/\.from\(/g)).toHaveLength(9);
    expect(readinessRepository).toContain('minimumQueryCount: 9');
    expect(readinessRepository).toContain("operation: 'aggregate-query-batch'");
    expect(readinessRepository).toContain('Promise.all([');
  });

  it('executes the repeatable repository baseline audit', () => {
    expect(packageJson).toContain('audit:p0-a1:workspace-performance');

    const output = execFileSync(
      process.execPath,
      ['scripts/audit-workspace-performance-baseline.mjs'],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
      },
    );
    const result = JSON.parse(output) as {
      canonicalDestinationCount: number;
      status: string;
    };

    expect(result).toMatchObject({
      canonicalDestinationCount: 5,
      status: 'pass',
    });
  });
});
