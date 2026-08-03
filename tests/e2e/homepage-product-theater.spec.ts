import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const assertNoHorizontalOverflow = async (page: Page) => {
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );

  expect(hasHorizontalOverflow).toBe(false);
};

test('renders the seamless campaign hero with a layered motion composition', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Undangan pernikahan yang terasa personal',
    }),
  ).toBeVisible();

  await expect(page.locator('main iframe')).toHaveCount(0);
  await expect(page.locator('[data-homepage-campaign-hero]')).toHaveCount(1);
  await expect(page.locator('[data-editorial-hero-theater]')).toBeVisible();
  await expect(page.locator('[data-editorial-hero-motion]')).toHaveAttribute(
    'data-editorial-hero-motion',
    'true',
  );
  await expect(page.locator('[data-editorial-personal-card]')).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Jelajahi homepage Seraya' })).toHaveCount(0);

  await expect(
    page.getByRole('img', {
      name: /Visual editorial undangan Roselle untuk Kirana dan Arga dengan kartu undangan bergerak lembut/,
    }),
  ).toBeVisible();

  const primaryAction = page.getByRole('link', { name: 'Jelajahi koleksi' });
  await expect(primaryAction).toBeVisible();
  await expect(primaryAction).toHaveAttribute('href', '/templates');

  const [environmentResponse, detailResponse] = await Promise.all([
    page.request.get('/showroom/kirana-arga/kirana-arga-environmental-wide.avif'),
    page.request.get('/showroom/kirana-arga/kirana-arga-detail-rings.avif'),
  ]);
  expect(environmentResponse.ok()).toBe(true);
  expect(detailResponse.ok()).toBe(true);

  const [headerBorderWidth, heroBackground, bodyBackground, heroAnimationName] = await page.evaluate(
    () => {
      const header = document.querySelector('header');
      const hero = document.querySelector<HTMLElement>('[data-homepage-campaign-hero]');
      const theater = document.querySelector<HTMLElement>('[data-editorial-hero-theater]');

      return [
        header ? window.getComputedStyle(header).borderBottomWidth : null,
        hero ? window.getComputedStyle(hero).backgroundColor : null,
        window.getComputedStyle(document.body).backgroundColor,
        theater ? window.getComputedStyle(theater).animationName : null,
      ];
    },
  );

  expect(headerBorderWidth).toBe('0px');
  expect(heroBackground).toBe(bodyBackground);
  expect(heroAnimationName).not.toBe('none');
  await assertNoHorizontalOverflow(page);
});

test('keeps the campaign hero composed on a narrow mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/');

  await expect(page.locator('[data-homepage-campaign-hero]')).toBeVisible();
  await expect(page.locator('[data-editorial-hero-theater]')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Jelajahi koleksi' })).toBeVisible();
  await assertNoHorizontalOverflow(page);
});

test('respects reduced motion for the campaign composition', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  const animationName = await page
    .locator('[data-editorial-hero-theater]')
    .evaluate((element) => window.getComputedStyle(element).animationName);

  expect(animationName).toBe('none');
});
