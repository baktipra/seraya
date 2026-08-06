import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'invitation-studio-publish-mode-slice-f.spec.ts',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:3111',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm exec next dev -- --hostname 127.0.0.1 --port 3111 tests/e2e/fixture-app',
    url: 'http://127.0.0.1:3111/invitation-studio-slice-f?mode=publish',
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'], viewport: { height: 1000, width: 1536 } },
    },
    {
      name: 'chromium-mobile',
      use: { ...devices['Pixel 7'] },
    },
  ],
});
