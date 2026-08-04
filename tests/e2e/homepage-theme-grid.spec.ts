import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const assertNoHorizontalOverflow = async (page: Page) => {
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );

  expect(hasHorizontalOverflow).toBe(false);
};

test('shows a compact interactive featured theme grid on the homepage', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { level: 2, name: 'Pilih yang paling terasa kalian.' }),
  ).toBeVisible();
  await expect(page.locator('[data-homepage-theme-grid]')).toHaveCount(1);
  await expect(page.locator('[data-homepage-theme-card]')).toHaveCount(3);

  const roselleCard = page.locator('[data-homepage-theme-card="roselle"]');
  const previewLink = roselleCard.getByRole('link', { name: 'Preview' });
  const selectLink = roselleCard.getByRole('link', { name: /Pilih tema/ });

  await expect(roselleCard).toHaveAttribute('data-active-palette', 'rose');
  await expect(previewLink).toHaveAttribute(
    'href',
    '/templates/roselle/demo/generic?palette=rose',
  );
  await expect(selectLink).toHaveAttribute(
    'href',
    '/dashboard/new?template=roselle&palette=rose',
  );

  const preview = roselleCard.getByRole('img');
  const initialBackground = await preview.evaluate(
    (element) => window.getComputedStyle(element).backgroundColor,
  );

  const sageOption = roselleCard.getByRole('radio', {
    name: 'Gunakan warna Sage untuk Roselle',
  });
  await roselleCard.locator('label[title="Sage"]').click();
  await expect(sageOption).toBeChecked();
  await expect(roselleCard).toHaveAttribute('data-active-palette', 'sage');
  await expect(previewLink).toHaveAttribute(
    'href',
    '/templates/roselle/demo/generic?palette=sage',
  );
  await expect(selectLink).toHaveAttribute(
    'href',
    '/dashboard/new?template=roselle&palette=sage',
  );

  await expect
    .poll(() => preview.evaluate((element) => window.getComputedStyle(element).backgroundColor))
    .not.toBe(initialBackground);

  await assertNoHorizontalOverflow(page);
});

test('keeps theme discovery usable at 320 px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/');

  const cards = page.locator('[data-homepage-theme-card]');
  await expect(cards).toHaveCount(3);
  await expect(cards.first().getByRole('link', { name: 'Preview' })).toBeVisible();
  await expect(cards.first().getByRole('link', { name: /Pilih tema/ })).toBeVisible();
  await assertNoHorizontalOverflow(page);
});
