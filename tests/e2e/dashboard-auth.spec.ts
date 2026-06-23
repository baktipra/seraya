import { expect, test } from '@playwright/test';

test('redirects an anonymous visitor from dashboard to login through the request proxy', async ({
  page,
}) => {
  await page.goto('/dashboard');

  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
  await expect(page.getByRole('heading', { name: 'Masuk ke Seraya' })).toBeVisible();
});
