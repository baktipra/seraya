import { expect, test } from '@playwright/test';

test('presents the collection without embedded showroom chrome', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: /Satu undangan yang indah\. Personal untuk setiap tamu\./,
    }),
  ).toBeVisible();

  await expect(page.locator('main iframe')).toHaveCount(0);
  await expect(page.locator('[data-marketing-invitation-preview="roselle"]')).toHaveCount(2);
  await expect(page.locator('[data-marketing-invitation-preview="aruna"]')).toHaveCount(1);
  await expect(page.locator('[data-marketing-invitation-preview="laras"]')).toHaveCount(1);

  await expect(
    page.getByRole('img', {
      name: /Preview artistik koleksi roselle: undangan Kirana dan Arga/,
    }).first(),
  ).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );

  expect(hasHorizontalOverflow).toBe(false);
});
