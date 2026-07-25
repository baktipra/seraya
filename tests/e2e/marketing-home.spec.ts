import { expect, test } from '@playwright/test';

test('renders the public Seraya flagship conversion journey', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle('Seraya — Pengalaman tamu pernikahan yang personal');
  await expect(
    page.getByRole('heading', {
      name: /Satu undangan yang indah\. Personal untuk setiap tamu\./i,
    }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Masuk' }).first()).toHaveAttribute('href', '/login');
  await expect(page.getByRole('link', { name: 'Mulai buat undangan' }).first()).toHaveAttribute(
    'href',
    '/dashboard/new',
  );
  await expect(page.getByRole('link', { name: 'Lihat koleksi desain' })).toHaveAttribute(
    'href',
    '/templates',
  );
  await expect(page.locator('#cara-kerja')).toContainText('Bagikan secara personal');
  await expect(page.locator('#untuk-indonesia')).toContainText('WhatsApp-first');
});

test('keeps the desktop flagship conversion actions above the fold', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/');

  const hero = page.locator('main > section').first();
  const primaryCta = hero.getByRole('link', { name: 'Mulai buat undangan' });
  const secondaryCta = hero.getByRole('link', { name: 'Lihat koleksi desain' });
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

test('presents Roselle, Aruna, and Laras as distinct public collections', async ({ page }) => {
  await page.goto('/templates');

  await expect(
    page.getByRole('heading', { name: /Pilih rasa, bukan sekadar tema\./i }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Roselle' }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Aruna' }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Laras' }).first()).toBeVisible();
  await expect(page.getByText('Romantic warmth').first()).toBeVisible();
  await expect(page.getByText('Modern editorial').first()).toBeVisible();
  await expect(page.getByText('Formal evening').first()).toBeVisible();
});
