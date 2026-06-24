import { expect, test } from '@playwright/test';

test('renders the public Seraya landing page conversion layer', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle('Seraya — Undangan pernikahan digital yang terasa personal');
  await expect(
    page.getByRole('heading', {
      name: /Buat undangan yang rapi, lalu bagikan dengan cara yang lebih personal\./i,
    }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Masuk' }).first()).toHaveAttribute('href', '/login');
  await expect(page.getByRole('link', { name: 'Mulai buat undangan' }).first()).toHaveAttribute(
    'href',
    '/dashboard/new',
  );
  await expect(page.getByRole('link', { name: 'Lihat cara kerjanya' })).toHaveAttribute(
    'href',
    '#cara-kerja',
  );
  await expect(page.locator('#cara-kerja')).toContainText('Bagikan dan terima RSVP');
});
