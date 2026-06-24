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

test('keeps the desktop hero conversion actions above the fold', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/');

  const hero = page.locator('main > section').first();
  const primaryCta = hero.getByRole('link', { name: 'Mulai buat undangan' });
  const secondaryCta = hero.getByRole('link', { name: 'Lihat cara kerjanya' });
  const visual = hero.locator('figure');

  await expect(primaryCta).toBeVisible();
  await expect(secondaryCta).toBeVisible();
  await expect(visual).toBeVisible();

  const [primaryBox, secondaryBox, visualBox] = await Promise.all([
    primaryCta.boundingBox(),
    secondaryCta.boundingBox(),
    visual.boundingBox(),
  ]);

  expect(primaryBox).not.toBeNull();
  expect(secondaryBox).not.toBeNull();
  expect(visualBox).not.toBeNull();
  expect(
    (primaryBox?.y ?? Number.POSITIVE_INFINITY) + (primaryBox?.height ?? 0),
  ).toBeLessThanOrEqual(768);
  expect(
    (secondaryBox?.y ?? Number.POSITIVE_INFINITY) + (secondaryBox?.height ?? 0),
  ).toBeLessThanOrEqual(768);
  expect(visualBox?.y ?? Number.POSITIVE_INFINITY).toBeLessThan(768);
});
