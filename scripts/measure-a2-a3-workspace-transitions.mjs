import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { chromium, devices } from '@playwright/test';

const captureKey = 'seraya:p0-a2-a3-captured-metrics';
const outputDirectory = join(process.cwd(), 'p0-a2-a3-matrix');
const baseUrl = process.env.P0_A2_A3_BASE_URL;
const githubToken = process.env.GITHUB_TOKEN;
const githubRunId = process.env.GITHUB_RUN_ID;
const measuredSha = process.env.P0_A2_A3_MEASURED_SHA;

if (!baseUrl || !githubToken || !githubRunId || !measuredSha) {
  throw new Error('P0-A2/A3 measurement environment is incomplete.');
}

const workspaceTargets = [
  { label: 'Undangan', path: '/invitation', transition: 'Ringkasan → Undangan' },
  { label: 'Tamu', path: '/guests', transition: 'Undangan → Tamu' },
  { label: 'Bagikan', path: '/delivery', transition: 'Tamu → Bagikan' },
  { label: 'Respons Tamu', path: '/rsvp', transition: 'Bagikan → Respons Tamu' },
  { label: 'Ringkasan', path: '', transition: 'Respons Tamu → Ringkasan' },
];

const deviceProfiles = [
  { descriptor: devices['Desktop Chrome'], name: 'desktop' },
  { descriptor: devices['Pixel 7'], name: 'mobile' },
];

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const round = (value) => Math.round(value * 100) / 100;

function percentile(values, quantile) {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const position = (sorted.length - 1) * quantile;
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);
  const fraction = position - lowerIndex;
  return sorted[lowerIndex] + (sorted[upperIndex] - sorted[lowerIndex]) * fraction;
}

function summarize(records, key) {
  const samples = records.map((record) => Number(record[key] ?? 0));
  return {
    median: round(percentile(samples, 0.5)),
    p75: round(percentile(samples, 0.75)),
    samples,
  };
}

function buildSummary(records) {
  return deviceProfiles.flatMap(({ name }) =>
    workspaceTargets.map(({ transition }) => {
      const matching = records.filter(
        (record) => record.device === name && record.transition === transition,
      );
      return {
        device: name,
        transition,
        totalMs: summarize(matching, 'total_ms'),
        rscRequestCount: summarize(matching, 'rsc_request_count'),
        rscTransferBytes: summarize(matching, 'rsc_transfer_bytes'),
        rscDurationMs: summarize(matching, 'rsc_duration_ms'),
      };
    }),
  );
}

function buildMarkdown(metadata, summary) {
  const rows = summary.map((item) =>
    `| ${item.device} | ${item.transition} | ${item.totalMs.samples.join(' / ')} | ${item.totalMs.median} | ${item.totalMs.p75} | ${item.rscRequestCount.median} | ${item.rscTransferBytes.median} | ${item.rscDurationMs.median} |`,
  );
  return [
    '# P0-A2/A3 Authenticated Workspace Transition Matrix',
    '',
    `- Measured SHA: \`${metadata.measuredSha}\``,
    `- Started: ${metadata.startedAt}`,
    `- Finished: ${metadata.finishedAt}`,
    '- Method: one unrecorded warm-up cycle, then three recorded ordinary-click client-navigation cycles per device.',
    '- Mobile links use ordinary Playwright pointer clicks; no force option is used.',
    '',
    '| Device | Transition | Total ms samples | Median ms | P75 ms | Median RSC requests | Median RSC bytes | Median RSC duration ms |',
    '| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |',
    ...rows,
    '',
  ].join('\n');
}

async function requestAuthenticatedDashboardPath(page, sharedUrl) {
  const endpoint = new URL('/api/internal/p0-a2-a3-auth', sharedUrl.origin);
  const shareToken = sharedUrl.searchParams.get('_vercel_share');
  if (shareToken) endpoint.searchParams.set('_vercel_share', shareToken);

  for (let attempt = 1; attempt <= 60; attempt += 1) {
    const result = await page.evaluate(
      async ({ endpointUrl, runId, sha, token }) => {
        const response = await window.fetch(endpointUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'x-github-run-id': runId,
            'x-github-sha': sha,
          },
        });
        return {
          body: await response.text(),
          contentType: response.headers.get('content-type') ?? '',
          ok: response.ok,
          status: response.status,
        };
      },
      {
        endpointUrl: endpoint.toString(),
        runId: githubRunId,
        sha: measuredSha,
        token: githubToken,
      },
    );

    if (result.ok) {
      if (!result.contentType.includes('application/json')) {
        throw new Error(`Auth bridge returned non-JSON content: ${result.body.slice(0, 120)}`);
      }
      const payload = JSON.parse(result.body);
      if (typeof payload.dashboardPath !== 'string') {
        throw new Error('Auth bridge returned an invalid dashboard path.');
      }
      return payload.dashboardPath;
    }

    if ([404, 409, 503].includes(result.status) && attempt < 60) {
      await sleep(5_000);
      continue;
    }

    throw new Error(`Auth bridge failed with ${result.status}: ${result.body.slice(0, 200)}`);
  }

  throw new Error('Frozen preview did not become measurable before timeout.');
}

async function installMetricCapture(context) {
  await context.addInitScript((key) => {
    window.addEventListener('seraya:workspace-performance', (event) => {
      try {
        const existing = JSON.parse(window.sessionStorage.getItem(key) ?? '[]');
        existing.push({ ...event.detail, captured_epoch_ms: Date.now() });
        window.sessionStorage.setItem(key, JSON.stringify(existing));
      } catch {
        // Measurement capture must never affect product behavior.
      }
    });
  }, captureKey);
}

async function getMetrics(page) {
  return page.evaluate((key) => {
    try {
      return JSON.parse(window.sessionStorage.getItem(key) ?? '[]');
    } catch {
      return [];
    }
  }, captureKey);
}

async function clearMetrics(page) {
  await page.evaluate((key) => window.sessionStorage.setItem(key, '[]'), captureKey);
}

async function clickWorkspace(page, profileName, projectRoot, target) {
  const before = (await getMetrics(page)).length;
  const navigationName =
    profileName === 'desktop' ? 'Navigasi workspace' : 'Navigasi workspace mobile';
  const navigation = page.getByRole('navigation', { name: navigationName });
  const expectedUrl = `${projectRoot}${target.path}`;

  await navigation.getByRole('link', { exact: true, name: target.label }).click();
  await page.waitForURL((url) => url.pathname === new URL(expectedUrl).pathname, {
    timeout: 60_000,
  });
  await page.waitForFunction(
    ([key, previousCount]) => {
      try {
        return JSON.parse(window.sessionStorage.getItem(key) ?? '[]').length > previousCount;
      } catch {
        return false;
      }
    },
    [captureKey, before],
    { timeout: 60_000 },
  );

  return (await getMetrics(page)).at(-1);
}

async function openProject(browser, profile) {
  const context = await browser.newContext({ ...profile.descriptor });
  await installMetricCapture(context);
  const page = await context.newPage();
  const sharedUrl = new URL(baseUrl);

  await page.goto(sharedUrl.toString(), { waitUntil: 'domcontentloaded', timeout: 120_000 });
  const dashboardPath = await requestAuthenticatedDashboardPath(page, sharedUrl);
  const dashboardUrl = new URL(dashboardPath, sharedUrl.origin);
  const shareToken = sharedUrl.searchParams.get('_vercel_share');
  if (shareToken) dashboardUrl.searchParams.set('_vercel_share', shareToken);

  await page.goto(dashboardUrl.toString(), { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.waitForURL((url) => url.pathname === '/dashboard', { timeout: 120_000 });
  await page.getByRole('button', { name: 'Buka undangan' }).first().click();
  await page.waitForURL(/\/dashboard\/[0-9a-f-]{36}$/i, { timeout: 120_000 });
  await page.locator('[data-project-workspace-shell]').waitFor({ timeout: 60_000 });

  return {
    context,
    page,
    projectRoot: new URL(page.url()).origin + new URL(page.url()).pathname,
  };
}

async function measureDevice(browser, profile) {
  const { context, page, projectRoot } = await openProject(browser, profile);
  const records = [];
  try {
    for (const target of workspaceTargets) {
      await clickWorkspace(page, profile.name, projectRoot, target);
    }
    await clearMetrics(page);

    for (let iteration = 1; iteration <= 3; iteration += 1) {
      for (const target of workspaceTargets) {
        const metric = await clickWorkspace(page, profile.name, projectRoot, target);
        records.push({
          ...metric,
          device: profile.name,
          iteration,
          transition: target.transition,
        });
      }
    }
  } finally {
    await context.close();
  }
  return records;
}

const startedAt = new Date().toISOString();
const browser = await chromium.launch();
const records = [];
try {
  for (const profile of deviceProfiles) {
    records.push(...(await measureDevice(browser, profile)));
  }
} finally {
  await browser.close();
}

const metadata = {
  measuredSha,
  runId: githubRunId,
  startedAt,
  finishedAt: new Date().toISOString(),
};
const summary = buildSummary(records);
await mkdir(outputDirectory, { recursive: true });
await writeFile(
  join(outputDirectory, 'matrix.json'),
  `${JSON.stringify({ metadata, records, summary }, null, 2)}\n`,
  'utf8',
);
await writeFile(join(outputDirectory, 'matrix.md'), buildMarkdown(metadata, summary), 'utf8');
console.log(`P0-A2/A3 authenticated transition matrix captured: ${records.length} measurements.`);
