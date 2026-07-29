import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');

const navigation = read('src/components/dashboard/project-navigation.tsx');
const workspacePage = read('src/components/workspace/workspace-page.tsx');
const readinessRepository = read(
  'src/modules/readiness/wedding-readiness.repository.ts',
);
const routeFiles = [
  'src/app/(dashboard)/dashboard/[projectId]/page.tsx',
  'src/app/(dashboard)/dashboard/[projectId]/invitation/page.tsx',
  'src/app/(dashboard)/dashboard/[projectId]/guests/page.tsx',
  'src/app/(dashboard)/dashboard/[projectId]/delivery/page.tsx',
  'src/app/(dashboard)/dashboard/[projectId]/rsvp/page.tsx',
];

const routes = routeFiles.map((path) => {
  const source = read(path);
  return {
    forceDynamic: source.includes("export const dynamic = 'force-dynamic'"),
    forceNoStore: source.includes("export const fetchCache = 'force-no-store'"),
    path,
    revalidateZero: source.includes('export const revalidate = 0'),
  };
});

const readinessQueryCount = (readinessRepository.match(/\.from\(/g) ?? []).length;
const canonicalDestinationCount = (
  navigation.match(/performanceWorkspace:/g) ?? []
).length;

const baseline = {
  baseline: 'P0-A1 Workspace Performance Instrumentation & Baseline V1',
  canonicalDestinationCount,
  clientInstrumentation: {
    navigationStart: navigation.includes('beginWorkspaceTransition'),
    prefetchExplicitlyDisabled: navigation.includes('prefetch={false}'),
    workspaceReadyProbe: workspacePage.includes('WorkspacePerformanceProbe'),
  },
  readinessAggregate: {
    parallelQueryCount: readinessQueryCount,
    serverTimingInstrumented: readinessRepository.includes(
      "operation: 'aggregate-query-batch'",
    ),
  },
  routes,
};

const failures = [];
if (canonicalDestinationCount !== 5) failures.push('Expected five canonical workspace destinations.');
if (!baseline.clientInstrumentation.navigationStart)
  failures.push('Workspace navigation start instrumentation is missing.');
if (!baseline.clientInstrumentation.workspaceReadyProbe)
  failures.push('Workspace ready instrumentation is missing.');
if (readinessQueryCount !== 9)
  failures.push(`Expected nine readiness queries, found ${readinessQueryCount}.`);
if (!baseline.readinessAggregate.serverTimingInstrumented)
  failures.push('Readiness query-batch timing is missing.');

console.log(JSON.stringify({ ...baseline, failures, status: failures.length ? 'failed' : 'pass' }, null, 2));

if (failures.length) process.exitCode = 1;
