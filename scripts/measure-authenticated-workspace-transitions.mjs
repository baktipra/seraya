import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { chromium, devices } from '@playwright/test';

const captureKey = 'seraya:p0-a1-captured-metrics';
const outputDirectory = join(process.cwd(), 'p0-a1-matrix');
const baseUrl = process.env.P0_A1_BASE_URL;
const githubToken = process.env.GITHUB_TOKEN;
const githubRunId = process.env.GITHUB_RUN_ID;
const githubHeadSha = process.env.P0_A1_HEAD_SHA;

if (!baseUrl || !githubToken || !githubRunId || !githubHeadSha) {
  throw new Error('P0-A1 measurement environment is incomplete.');
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

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function round(value) {
  return Math.round(value * 100) / 100;
}

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

function summarizeMetric(records, key) {
  const values = records.map((record) => Number(record[key] ?? 0));
  return {
    median: round(percentile(values, 0.5)),
    p75: round(percentile(values, 0.75)),
    samples: values,
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
        rscDurationMs: summarizeMetric(matching, 'rsc_duration_ms'),
        rscRequestCount: summarizeMetric(matching, 'rsc_request_count'),
        rscTransferBytes: summarizeMetric(matching, 'rsc_transfer_bytes'),
        totalMs: summarizeMetric(matching, 'total_ms'),
        transition,
      };
    }),
  );
}

function buildMarkdown(metadata, summary) {
  const rows = summary.map((item) => {
    const totalSamples = item.totalMs.samples.join(' / ');
    return `| ${item.device} | ${item.transition} | ${totalSamples} | ${item.totalMs.median} | ${item.totalMs.p75} | ${item.rscRequestCount.median} | ${item.rscTransferBytes.median} | ${item.rscDurationMs.median} |`;
  });

  return [
    '# P0-A1 Authenticated Workspace Transition Matrix',
    '',
    `- Head: \`${metadata.headSha}\``,
    `- Started: ${metadata.startedAt}`,
    `- Finished: ${metadata.finishedAt}`,
    '- Method: one unrecorded warm-up cycle, then three recorded warm client-navigation cycles per device.',
    '- Route and project identifiers are redacted by the application instrumentation.',
    '',
    '| Device | Transition | Total ms samples | Median ms | P75 ms | Median RSC requests | Median RSC bytes | Median RSC duration ms |',
    '| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |',
    ...rows,
    '',
  ].join('\n');
}

async function requestAuthenticatedLink(page, sharedUrl) {
  const endpoint = new URL('/api/internal/p0-a1-auth', sharedUrl.origin);
  const shareToken = sharedUrl.searchParams.get('_vercel_share');
  if (shareToken) endpoint.searchParams.set('_vercel_share', shareToken);

  for (let attempt = 1; attempt <= 60; attempt += 1) {
    const result = await page.evaluate(
      async ({ endpointUrl, headSha, runId, token }) => {
        const response = await window.fetch(endpointUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-github-run-id': runId,
            'x-github-sha': headSha,
          },
          method: 'POST',
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
        headSha: githubHeadSha,
        runId: githubRunId,
        token: githubToken,
      },
    );

    if (result.ok) {
      if (!result.contentType.includes('application/json')) {
        throw new Error(
          `Preview auth bridge returned ${result.contentType || 'unknown content type'}: ${result.body.slice(0, 120)}`,
        );
      }

      const payload = JSON.parse(result.body);
      if (typeof payload.actionLink !== 'string' || payload.actionLink.length === 0) {
        throw new Error('Preview auth bridge returned an invalid action link.');
      }
      return payload.actionLink;
    }

    if ([404, 409, 503].includes(result.status) && attempt < 60) {
      await sleep(5_000);
      continue;
    }

    throw new Error(
      `Preview auth bridge failed with ${result.status}: ${result.body.slice(0, 200)}`,
    );
  }

  throw new Error('Preview deployment did not become current before the measurement timeout.');
}

async function installMetricCapture(context) {
  await context.addInitScript((key) => {
    const append = (detail) => {
      try {
        const existing = JSON.parse(window.sessionStorage.getItem(key) ?? '[]');
        existing.push({ ...detail, captured_epoch_ms: Date.now() });
        window.sessionStorage.setItem(key, JSON.stringify(existing));
      } catch {
        // Measurement capture must not interfere with the page under test.
      }
    };

    window.addEventListener('seraya:workspace-performance', (event) => {
      append(event.detail);
    });
  }, captureKey);
}

async function getCapturedMetrics(page) {
  return page.evaluate((key) => {
    try {
      return JSON.parse(window.sessionStorage.getItem(key) ?? '[]');
    } catch {
      return [];
    }
  }, captureKey);
}

async function clearCapturedMetrics(page) {
  await page.evaluate((key) => window.sessionStorage.setItem(key, '[]'), captureKey);
}

async function clickWorkspace(page, deviceName, projectRoot, target) {
  const before = (await getCapturedMetrics(page)).length;
  const navigationLabel =
    deviceName === 'desktop' ? 'Navigasi workspace' : 'Navigasi workspace mobile';
  const navigation = page.getByRole('navigation', { name: navigationLabel });
  const expectedUrl = `${projectRoot}${target.path}`;

  await navigation.getByRole('link', { exact: true, name: target.label }).click();
  await page.waitForURL((url) => url.pathname === new URL(expectedUrl).pathname, {
    timeout: 60_000,
  });
  await page.waitForFunction(
    ([key, previousCount]) => {
      try {
        const entries = JSON.parse(window.sessionStorage.getItem(key) ?? '[]');
        return entries.length > previousCount;
      } catch {
        return false;
      }
    },
    [captureKey, before],
    { timeout: 60_000 },
  );

  const captured = await getCapturedMetrics(page);
  return captured.at(-1);
}

async function openAuthenticatedProject(browser, profile) {
  const context = await browser.newContext({ ...profile.descriptor });
  await installMetricCapture(context);
  const page = await context.newPage();
  const sharedUrl = new URL(baseUrl);

  await page.goto(sharedUrl.toString(), { waitUntil: 'domcontentloaded', timeout: 120_000 });
  const actionLink = await requestAuthenticatedLink(page, sharedUrl);
  await page.goto(actionLink, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.waitForURL((url) => url.pathname === '/dashboard', { timeout: 120_000 });
  await page.getByRole('button', { name: 'Buka undangan' }).first().click();
  await page.waitForURL(/\/dashboard\/[0-9a-f-]{36}$/i, { timeout: 120_000 });
  await page
    .locator('[data-project-workspace-shell]')
    .waitFor({ state: 'visible', timeout: 60_000 });

  return {
    context,
    page,
    projectRoot: new URL(page.url()).origin + new URL(page.url()).pathname,
  };
}

async function measureDevice(browser, profile) {
  const { context, page, projectRoot } = await openAuthenticatedProject(browser, profile);
  const records = [];

  try {
    for (const target of workspaceTargets) {
      await clickWorkspace(page, profile.name, projectRoot, target);
    }

    await clearCapturedMetrics(page);

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

const finishedAt = new Date().toISOString();
const metadata = {
  finishedAt,
  headSha: githubHeadSha,
  runId: githubRunId,
  startedAt,
};
const summary = buildSummary(records);

await mkdir(outputDirectory, { recursive: true });
await writeFile(
  join(outputDirectory, 'matrix.json'),
  `${JSON.stringify({ metadata, records, summary }, null, 2)}\n`,
  'utf8',
);
await writeFile(join(outputDirectory, 'matrix.md'), buildMarkdown(metadata, summary), 'utf8');

console.log(`P0-A1 authenticated transition matrix captured: ${records.length} measurements.`);
