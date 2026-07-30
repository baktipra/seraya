import { mkdir, writeFile } from 'node:fs/promises';

import { chromium, devices } from '@playwright/test';

const targets = [
  { key: 'before', url: 'http://127.0.0.1:3101' },
  { key: 'after', url: 'http://127.0.0.1:3102' },
];
const profiles = [
  { key: 'desktop', options: { viewport: { height: 900, width: 1440 } } },
  { key: 'mobile', options: devices['Pixel 7'] },
];

function percentile(values, fraction) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)];
}

async function clickVisibleOpeningButton(page) {
  const buttons = page.locator(
    'button[aria-controls="invitation-editor-panel-opening"]',
  );
  for (let index = 0; index < (await buttons.count()); index += 1) {
    const button = buttons.nth(index);
    if (await button.isVisible()) {
      await button.click();
      return;
    }
  }
  throw new Error('No visible Pembuka chapter button.');
}

const browser = await chromium.launch();
const rows = [];

try {
  for (const target of targets) {
    for (const profile of profiles) {
      for (let sample = 1; sample <= 3; sample += 1) {
        const context = await browser.newContext(profile.options);
        const page = await context.newPage();
        const runtimeEvents = [];
        page.on('console', (message) => {
          try {
            const payload = JSON.parse(message.text());
            if (payload.source === 'invitation-editor-performance') runtimeEvents.push(payload);
          } catch {
            // Ignore unrelated browser logs.
          }
        });

        await page.goto(target.url, { waitUntil: 'domcontentloaded' });
        await page.locator('[data-dashboard-width="wide"]').waitFor({ state: 'attached' });

        const initial = await page.evaluate(() => {
          const root = document.querySelector('[data-dashboard-width="wide"]');
          const scripts = performance
            .getEntriesByType('resource')
            .filter(
              (entry) =>
                entry instanceof PerformanceResourceTiming && entry.initiatorType === 'script',
            );
          return {
            domNodeCount: root?.querySelectorAll('*').length ?? 0,
            mountedPanelCount:
              root?.querySelectorAll('[data-invitation-editor-panel]').length ?? 0,
            previewScreenPresent:
              root?.querySelectorAll('[data-local-preview-screen]').length ?? 0,
            scriptBytes: scripts.reduce(
              (total, entry) =>
                total +
                (entry instanceof PerformanceResourceTiming
                  ? entry.transferSize || entry.encodedBodySize || 0
                  : 0),
              0,
            ),
            shellAttachedMs: Math.round(performance.now()),
          };
        });

        await clickVisibleOpeningButton(page);
        await page.locator('input[name="hero.eyebrow"]').waitFor({ state: 'visible' });
        const chapterReadyMs = await page.evaluate(() => Math.round(performance.now()));

        let mobilePreviewDeferred = null;
        if (profile.key === 'mobile') {
          mobilePreviewDeferred = initial.previewScreenPresent === 0;
          await page.locator('[data-local-preview-trigger]').click();
          await page.locator('[data-local-preview-screen]').waitFor({ state: 'visible' });
        }

        rows.push({
          chapterReadyMs,
          initial,
          mobilePreviewDeferred,
          profile: profile.key,
          runtimeEvents,
          sample,
          target: target.key,
        });
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}

const summary = [];
for (const target of targets) {
  for (const profile of profiles) {
    const matching = rows.filter(
      (row) => row.target === target.key && row.profile === profile.key,
    );
    const values = (select) => matching.map(select);
    summary.push({
      chapterReadyMedianMs: percentile(values((row) => row.chapterReadyMs), 0.5),
      chapterReadyP75Ms: percentile(values((row) => row.chapterReadyMs), 0.75),
      domNodeMedian: percentile(values((row) => row.initial.domNodeCount), 0.5),
      initialScriptBytesMedian: percentile(values((row) => row.initial.scriptBytes), 0.5),
      mobilePreviewDeferred:
        profile.key === 'mobile'
          ? matching.every((row) => row.mobilePreviewDeferred === true)
          : null,
      mountedPanelMedian: percentile(values((row) => row.initial.mountedPanelCount), 0.5),
      profile: profile.key,
      samples: matching.length,
      shellAttachedMedianMs: percentile(values((row) => row.initial.shellAttachedMs), 0.5),
      target: target.key,
    });
  }
}

await mkdir('p0-a5-runtime-evidence', { recursive: true });
await writeFile(
  'p0-a5-runtime-evidence/evidence.json',
  `${JSON.stringify({ rows, summary }, null, 2)}\n`,
);
await writeFile(
  'p0-a5-runtime-evidence/evidence.md',
  [
    '# P0-A5 production runtime evidence',
    '',
    'Both revisions were built and served locally in production mode on the same GitHub Actions runner. Network and database latency are intentionally excluded.',
    '',
    '| Revision | Device | Samples | Shell median | Chapter-ready median / p75 | Mounted panels | DOM nodes | Initial JS bytes | Mobile preview deferred |',
    '|---|---|---:|---:|---:|---:|---:|---:|---|',
    ...summary.map(
      (row) =>
        `| ${row.target} | ${row.profile} | ${row.samples} | ${row.shellAttachedMedianMs} ms | ${row.chapterReadyMedianMs} / ${row.chapterReadyP75Ms} ms | ${row.mountedPanelMedian} | ${row.domNodeMedian} | ${row.initialScriptBytesMedian} | ${row.mobilePreviewDeferred ?? 'n/a'} |`,
    ),
    '',
  ].join('\n'),
);
console.log(JSON.stringify({ summary }, null, 2));
