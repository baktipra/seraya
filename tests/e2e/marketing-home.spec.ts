import { expect, test } from '@playwright/test';

test('renders the Seraya engineering foundation page', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Seraya/);
  await expect(page.getByRole('heading', { name: /Fondasi untuk undangan/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /Periksa status aplikasi/i })).toBeVisible();
});
