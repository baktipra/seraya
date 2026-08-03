import { expect, test } from '@playwright/test';

test('renders the editorial premium homepage hero without embedded UI', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: /Satu undangan yang indah\. Personal untuk setiap tamu\./,
    }),
  ).toBeVisible();

  await expect(page.locator('main iframe')).toHaveCount(0);
  await expect(page.locator('[data-homepage-editorial-hero]')).toHaveCount(1);
  await expect(page.locator('[data-editorial-hero-theater]')).toBeVisible();
  await expect(page.locator('[data-editorial-personal-card]')).toContainText(
    'Bapak Aditya & Keluarga',
  );

  await expect(
    page.getByRole('img', {
      name: /Komposisi stationery undangan Roselle untuk Kirana dan Arga/,
    }),
  ).toBeVisible();

  const rail = page.getByRole('navigation', { name: 'Jelajahi homepage Seraya' });
  await expect(rail.getByRole('link')).toHaveCount(5);

  for (const target of [
    'koleksi-roselle',
    'koleksi-aruna',
    'koleksi-laras',
    'cara-kerja',
    'tautan-personal',
  ]) {
    await expect(page.locator(`#${target}`)).toHaveCount(1);
  }

  for (const asset of [
    '/marketing/hero/seraya-botanical-corner.svg',
    '/marketing/hero/seraya-envelope-outline.svg',
    '/marketing/hero/seraya-reply-mark.svg',
    '/marketing/hero/seraya-stationery-grain.svg',
    '/marketing/hero/seraya-wax-monogram.svg',
  ]) {
    const response = await page.request.get(asset);
    expect(response.ok(), `${asset} should load`).toBe(true);
  }

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );

  expect(hasHorizontalOverflow).toBe(false);
});

test('respects reduced motion for the editorial stationery composition', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  const animationName = await page
    .locator('[data-editorial-personal-card]')
    .evaluate((element) => window.getComputedStyle(element).animationName);

  expect(animationName).toBe('none');
});
