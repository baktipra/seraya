import { expect, test } from '@playwright/test';

test('renders homepage product theater without iframes', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: /Satu undangan yang indah\. Personal untuk setiap tamu\./,
    }),
  ).toBeVisible();

  const rosellePreviews = page.locator('[data-marketing-invitation-preview="roselle"]');
  const arunaPreviews = page.locator('[data-marketing-invitation-preview="aruna"]');
  const larasPreviews = page.locator('[data-marketing-invitation-preview="laras"]');

  await expect(page.locator('main iframe')).toHaveCount(0);
  await expect(rosellePreviews).toHaveCount(2);
  await expect(arunaPreviews).toHaveCount(1);
  await expect(larasPreviews).toHaveCount(1);

  await expect(
    page
      .getByRole('img', {
        name: /Preview artistik koleksi roselle: undangan Kirana dan Arga/,
      })
      .first(),
  ).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );

  expect(hasHorizontalOverflow).toBe(false);
});
