import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { chromium } from '@playwright/test';

const CAPTURE_MATRIX = Object.freeze({
  aruna: ['stone', 'matcha', 'cobalt', 'apricot'],
  laras: ['midnight', 'burgundy', 'emerald', 'ivory'],
  roselle: ['rose', 'sage', 'butter', 'berry'],
});

const VIEWPORT = Object.freeze({
  deviceScaleFactor: 2,
  height: 932,
  width: 430,
});

function readArgument(name, fallback) {
  const prefix = `--${name}=`;
  const value = process.argv.find((argument) => argument.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

const baseUrl = readArgument(
  'base-url',
  process.env.SERAYA_THUMBNAIL_BASE_URL ?? 'http://127.0.0.1:3000',
);
const outputDirectory = resolve(
  readArgument('output', 'public/invitation-thumbnails/v4g'),
);

await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });
const entries = [];

try {
  for (const [templateKey, paletteKeys] of Object.entries(CAPTURE_MATRIX)) {
    for (const paletteKey of paletteKeys) {
      const route = `/templates/${templateKey}/demo/generic?palette=${paletteKey}&embed=thumbnail`;
      const page = await browser.newPage({
        deviceScaleFactor: VIEWPORT.deviceScaleFactor,
        viewport: { height: VIEWPORT.height, width: VIEWPORT.width },
      });

      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(new URL(route, baseUrl).toString(), {
        timeout: 90_000,
        waitUntil: 'networkidle',
      });
      await page
        .locator(`[data-template="${templateKey}"][data-palette="${paletteKey}"]`)
        .waitFor({
          state: 'visible',
          timeout: 30_000,
        });
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      await page.addStyleTag({
        content:
          '*,*::before,*::after{animation:none!important;caret-color:transparent!important;transition:none!important}',
      });

      const fileName = `${templateKey}-${paletteKey}.png`;
      await page.screenshot({
        animations: 'disabled',
        fullPage: false,
        path: resolve(outputDirectory, fileName),
        type: 'png',
      });

      entries.push({
        fallback: `/invitation-thumbnails/v4g/${templateKey}.svg`,
        height: VIEWPORT.height,
        paletteKey,
        sourceRoute: route,
        templateKey,
        webp: `/invitation-thumbnails/v4g/${templateKey}-${paletteKey}.webp`,
        width: VIEWPORT.width,
      });
      await page.close();
      console.log(`Captured ${templateKey}/${paletteKey}`);
    }
  }
} finally {
  await browser.close();
}

await writeFile(
  resolve(outputDirectory, 'manifest.json'),
  `${JSON.stringify(
    {
      captureViewport: VIEWPORT,
      entries,
      generatedAt: new Date().toISOString(),
      source: 'canonical-showroom-renderer',
      version: 'v4g',
    },
    null,
    2,
  )}\n`,
  'utf8',
);
