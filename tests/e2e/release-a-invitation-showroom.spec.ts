import { expect, test } from '@playwright/test';

test('shows all invitation collections and public-personal surfaces in the review showroom', async ({
  page,
}) => {
  await page.goto('/release-a-invitation-preview');

  await expect(
    page.getByRole('heading', { name: 'Invitation Experience Maturation' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Roselle' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('link', { name: 'Undangan personal' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(page.locator('article[data-template="roselle"]')).toBeVisible();
  await expect(page.locator('[data-template-personal-greeting="roselle"]')).toBeVisible();
  await expect(page.locator('[data-template-response-journey="roselle"]')).toBeVisible();

  await page.getByRole('link', { name: 'Aruna' }).click();
  await expect(page).toHaveURL(/template=aruna/);
  await expect(page.locator('article[data-template="aruna"]')).toBeVisible();

  await page.getByRole('link', { name: 'Laras' }).click();
  await expect(page).toHaveURL(/template=laras/);
  await expect(page.locator('article[data-template="laras"]')).toBeVisible();

  await page.getByRole('link', { name: 'Undangan publik' }).click();
  await expect(page).toHaveURL(/surface=generic/);
  await expect(page.locator('[data-template-personal-greeting]')).toHaveCount(0);
  await expect(page.locator('[data-template-response-journey]')).toHaveCount(0);
  await expect(page.locator('[data-generic-response-note="laras"]')).toBeVisible();
});
