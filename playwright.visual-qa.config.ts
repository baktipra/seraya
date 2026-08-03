import { defineConfig } from '@playwright/test';

const baseURL = 'http://127.0.0.1:3200';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'visual-qa-hardening.spec.ts',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    reducedMotion: 'reduce',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop-1440',
      use: {
        deviceScaleFactor: 1,
        hasTouch: false,
        isMobile: false,
        viewport: { height: 1000, width: 1440 },
      },
    },
    {
      name: 'mobile-320',
      use: {
        deviceScaleFactor: 1,
        hasTouch: true,
        isMobile: true,
        viewport: { height: 740, width: 320 },
      },
    },
  ],
  webServer: {
    command: 'next dev tests/e2e/fixture-app --hostname 127.0.0.1 --port 3200',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: baseURL,
  },
});
