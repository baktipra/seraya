import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { chromium, devices } from '@playwright/test';

const baseUrl = process.env.P0_A4_BASE_URL;
const measuredSha = process.env.P0_A4_MEASURED_SHA;
const githubToken = process.env.GITHUB_TOKEN;
const githubRunId = process.env.GITHUB_RUN_ID;

if (!baseUrl || !measuredSha || !githubToken || !githubRunId) {
  throw new Error('Missing P0-A4 benchmark environment.');
}

const origin = new URL(baseUrl).origin;
const outputDirectory = join(process.cwd(), 'p0-a4-cold-load-evidence');
const profiles = [
  { name: 'desktop', options: { viewport: { height: 900, width: 1440 } } },
  { name: 'mobile', options: devices['Pixel 7'] },
];
const routeDefinitions = [
  { key: 'compass', label: 'Ringkasan', path: (projectId) => `/dashboard/${projectId}` },
  { key: 'studio', label: 'Undangan', path: (projectId) => `/dashboard/${projectId}/invitation` },
];

function percentile(values, fraction) {
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.ceil(sorted.length * fraction) - 1;
  return sorted[Math.max(0, index)];
}

function summarize(rows) {
  const grouped = [];
  for (const profile of profiles) {
    for (const route of routeDefinitions) {
      const matching = rows.filter(
        (row) => row.profile === profile.name && row.workspace === route.key,
      );
      const values = matching.map((row) => row.totalMs);
      grouped.push({
        label: route.label,
        maxMs: Math.max(...values),
        medianMs: percentile(values, 0.5),
        minMs: Math.min(...values),
        p75Ms: percentile(values, 0.75),
        profile: profile.name,
        samples: values.length,
      });
    }
  }
  return grouped;
}

async function authorize(page) {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  const result = await page.evaluate(
    async ({ githubRunId: runId, githubToken: token, measuredSha: sha }) => {
      const response = await fetch('/api/internal/p0-a4-auth', {
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-github-run-id': runId,
          'x-seraya-measured-sha': sha,
        },
        method: 'POST',
      });
      const contentType = response.headers.get('content-type') ?? '';
      if (!response.ok || !contentType.includes('application/json')) {
        throw new Error(`Benchmark authorization failed with ${response.status}.`);
      }
      return response.json();
    },
    { githubRunId, githubToken, measuredSha },
  );

  if (!result?.projectId || !result?.userId) {
    throw new Error('Benchmark authorization returned an incomplete fixture.');
  }
  return result;
}

async function measureDocumentLoad(page, target, workspace, sample) {
  await page.goto(`${origin}/release-a-preview`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ targetPath, workspaceKey }) => {
      const pending = {
        from: '/dashboard',
        navigationId: crypto.randomUUID(),
        startedAt: performance.now(),
        startedEpochMs: Date.now(),
        timeOrigin: performance.timeOrigin,
        to: targetPath,
        workspace: workspaceKey,
      };
      sessionStorage.setItem('seraya:workspace-transition:v1', JSON.stringify(pending));
    },
    { targetPath: target, workspaceKey: workspace },
  );

  const metricPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`No cold-load metric for ${target}.`)), 45_000);
    const listener = (message) => {
      try {
        const payload = JSON.parse(message.text());
        if (
          payload.event === 'workspace_transition_ready' &&
          payload.navigation_mode === 'document' &&
          payload.workspace === workspace
        ) {
          clearTimeout(timeout);
          page.off('console', listener);
          resolve(payload);
        }
      } catch {
        // Ignore unrelated browser logs.
      }
    };
    page.on('console', listener);
  });

  await page.goto(`${origin}${target}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.locator('[data-workspace-performance-probe]').waitFor({ state: 'attached' });
  const metric = await metricPromise;
  const navigation = await page.evaluate(() => {
    const entry = performance.getEntriesByType('navigation')[0];
    if (!(entry instanceof PerformanceNavigationTiming)) return null;
    return {
      domContentLoadedMs: Math.round(entry.domContentLoadedEventEnd),
      responseStartMs: Math.round(entry.responseStart),
      transferBytes: entry.transferSize || entry.encodedBodySize || 0,
    };
  });

  return {
    domContentLoadedMs: navigation?.domContentLoadedMs ?? null,
    responseStartMs: navigation?.responseStartMs ?? null,
    sample,
    totalMs: metric.total_ms,
    transferBytes: navigation?.transferBytes ?? null,
    workspace,
  };
}

const browser = await chromium.launch();
let fixture;
const rows = [];

try {
  const authorizationContext = await browser.newContext();
  const authorizationPage = await authorizationContext.newPage();
  fixture = await authorize(authorizationPage);
  const authenticatedCookies = await authorizationContext.cookies();

  for (const profile of profiles) {
    const context = await browser.newContext(profile.options);
    await context.addCookies(authenticatedCookies);
    const page = await context.newPage();

    for (const route of routeDefinitions) {
      const target = route.path(fixture.projectId);
      for (let sample = 1; sample <= 3; sample += 1) {
        const result = await measureDocumentLoad(page, target, route.key, sample);
        rows.push({ ...result, label: route.label, profile: profile.name });
      }
    }

    await context.close();
  }

  const cleanupResponse = await authorizationPage.evaluate(
    async ({ fixture: cleanupFixture, githubRunId: runId, githubToken: token, measuredSha: sha }) => {
      const response = await fetch('/api/internal/p0-a4-auth', {
        body: JSON.stringify(cleanupFixture),
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-github-run-id': runId,
          'x-seraya-measured-sha': sha,
        },
        method: 'DELETE',
      });
      return { ok: response.ok, status: response.status };
    },
    { fixture, githubRunId, githubToken, measuredSha },
  );
  if (!cleanupResponse.ok) {
    throw new Error(`Benchmark cleanup failed with ${cleanupResponse.status}.`);
  }

  await authorizationContext.close();
} finally {
  await browser.close();
}

await mkdir(outputDirectory, { recursive: true });
const summary = summarize(rows);
await writeFile(
  join(outputDirectory, 'p0-a4-cold-loads.json'),
  `${JSON.stringify({ measuredSha, rows, summary }, null, 2)}\n`,
);
await writeFile(
  join(outputDirectory, 'p0-a4-cold-loads.md'),
  [
    '# P0-A4 authenticated cold-load evidence',
    '',
    `Measured SHA: \`${measuredSha}\``,
    '',
    '| Device | Route | Samples | Median | P75 | Range |',
    '|---|---|---:|---:|---:|---:|',
    ...summary.map(
      (row) =>
        `| ${row.profile} | ${row.label} | ${row.samples} | ${row.medianMs} ms | ${row.p75Ms} ms | ${row.minMs}–${row.maxMs} ms |`,
    ),
    '',
    'Each sample is a full document navigation with the private workspace marked pending before navigation. No client-route prefetch is used.',
    '',
  ].join('\n'),
);

console.log(JSON.stringify({ measuredSha, summary }, null, 2));
