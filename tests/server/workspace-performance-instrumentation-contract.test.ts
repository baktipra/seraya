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
  ['src/app/(dashboard)/dashboard/[projectId]/layout.tsx', 'project-shell-identity'],
  ['src/app/(dashboard)/dashboard/[projectId]/page.tsx', 'overview-readiness'],
  ['src/app/(dashboard)/dashboard/[projectId]/invitation/page.tsx', 'invitation-editor-screen'],
  ['src/app/(dashboard)/dashboard/[projectId]/guests/page.tsx', 'guest-manager-screen'],
  ['src/app/(dashboard)/dashboard/[projectId]/delivery/page.tsx', 'delivery-center-screen'],
  ['src/app/(dashboard)/dashboard/[projectId]/rsvp/page.tsx', 'guest-response-screen'],
] as const;

describe('P0 workspace performance instrumentation contract', () => {
  it('continues measuring canonical navigation through rendered workspace readiness', () => {
    expect(navigation).toContain('beginWorkspaceTransition');
    expect(
      navigation.match(/performanceWorkspace: '(?:compass|studio|guests|delivery|responses)',/g),
    ).toHaveLength(5);
    expect(workspacePage).toContain('WorkspacePerformanceProbe');
    expect(clientMetrics).toContain("event: 'workspace_transition_started'");
    expect(clientMetrics).toContain("event: 'workspace_transition_ready'");
    expect(clientMetrics).toContain('rsc_transfer_bytes');
    expect(clientMetrics).toContain('total_ms');
  });

  it('keeps client metrics free of project identifiers', () => {
    expect(clientMetrics).toContain('normalizeWorkspacePath');
    expect(clientMetrics).toContain("'/dashboard/:projectId'");
    expect(clientMetrics).toContain('from: normalizeWorkspacePath');
    expect(clientMetrics).toContain('to: normalizeWorkspacePath');
  });

  it('restores canonical prefetch and immediate pending feedback after the A1 baseline', () => {
    expect(navigation).toContain('data-workspace-navigation-pending');
    expect(navigation).toContain('setPendingHref(String(item.href))');
    expect(navigation).toContain('Membuka halaman');
    expect(navigation).toContain('prefetch\n    >');
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

  it('records the recovered three-projection readiness measurement after A4', () => {
    expect(readinessRepository.match(/\.from\(/g)).toHaveLength(3);
    expect(readinessRepository).toContain('minimumQueryCount: 3');
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
