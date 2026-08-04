import { expect, test } from '@playwright/test';

test('uses the requested showroom palette', async ({ page }) => {
  await page.goto('/templates/roselle/demo/generic?palette=sage');

  const invitation = page.locator('[data-template="roselle"]');

  await expect(invitation).toHaveAttribute('data-palette', 'sage');
});

test('preserves palette across showroom surfaces', async ({ page }) => {
  await page.goto('/templates/roselle/demo/generic?palette=sage');

  const invitation = page.locator('[data-template="roselle"]');
  const personalLink = page.getByRole('link', { name: 'Undangan personal' });

  await expect(personalLink).toHaveAttribute(
    'href',
    '/templates/roselle/demo/personal?palette=sage',
  );

  await personalLink.click();
  await expect(page).toHaveURL(/\/templates\/roselle\/demo\/personal\?palette=sage$/);
  await expect(invitation).toHaveAttribute('data-palette', 'sage');
});

test('falls back from a cross-theme palette', async ({ page }) => {
  await page.goto('/templates/roselle/demo/generic?palette=midnight');

  const invitation = page.locator('[data-template="roselle"]');

  await expect(invitation).toHaveAttribute('data-palette', 'rose');
});
