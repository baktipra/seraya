import { expect, test } from '@playwright/test';

test.describe('Invitation Studio Slice C Design Mode', () => {
  test('updates the exact renderer from one shared template and palette state', async ({ page }) => {
    await page.goto('/invitation-studio-slice-c?mode=design');

    const studio = page.locator('[data-invitation-studio]');
    const designMode = page.locator('[data-invitation-studio-design-mode="canonical"]');
    const preview = page.locator('[data-invitation-studio-design-preview]');
    const saveAction = page.locator('[data-invitation-studio-save-action]');

    await expect(studio).toHaveAttribute('data-invitation-studio-active-mode', 'design');
    await expect(designMode).toBeVisible();
    await expect(saveAction).toHaveCount(1);
    await expect(preview).toHaveAttribute('data-preview-template', 'roselle');
    await expect(preview.locator('[data-template="roselle"]')).toBeVisible();

    await page.getByRole('radio', { name: /Aruna/i }).check();

    await expect(preview).toHaveAttribute('data-preview-template', 'aruna');
    await expect(preview.locator('[data-template="aruna"]')).toBeVisible();
    await expect(page.locator('[data-invitation-studio-save-state]')).toHaveAttribute(
      'data-invitation-studio-save-state',
      'dirty',
    );

    const paletteRadios = page.locator('input[name="paletteKey"]');
    await expect(paletteRadios).toHaveCount(4);
    const paletteValue = await paletteRadios.nth(1).getAttribute('value');
    await paletteRadios.nth(1).check();
    await expect(preview).toHaveAttribute('data-preview-palette', paletteValue ?? '');

    await page.getByRole('tab', { name: /^Isi/ }).click();
    await expect(studio).toHaveAttribute('data-invitation-studio-active-mode', 'content');
    await expect(page.locator('[data-slice-c-content-template]')).toHaveText('aruna');

    await page.getByRole('tab', { name: /^Desain/ }).click();
    await expect(preview).toHaveAttribute('data-preview-template', 'aruna');
    await expect(saveAction).toHaveCount(1);

    await saveAction.click();
    await expect(page.locator('[data-invitation-studio-save-state]')).toHaveAttribute(
      'data-invitation-studio-save-state',
      'saved',
    );
    await expect(page.getByText('Semua perubahan tersimpan')).toBeVisible();
  });

  test('supports Roselle, Aruna, and Laras with one exact preview authority', async ({ page }) => {
    await page.goto('/invitation-studio-slice-c?mode=design');

    const preview = page.locator('[data-invitation-studio-design-preview]');

    for (const template of ['Roselle', 'Aruna', 'Laras']) {
      await page.getByRole('radio', { name: new RegExp(template, 'i') }).check();
      await expect(preview).toHaveAttribute('data-preview-template', template.toLowerCase());
      await expect(preview.locator(`[data-template="${template.toLowerCase()}"]`)).toBeVisible();
    }

    await expect(page.locator('[data-invitation-studio-save-action]')).toHaveCount(1);
  });

  test('switches preview viewport without horizontal page overflow', async ({ page }) => {
    await page.goto('/invitation-studio-slice-c?mode=design');

    const preview = page.locator('[data-invitation-studio-design-preview]');
    await page.getByRole('button', { name: 'Desktop' }).click();
    await expect(preview).toHaveAttribute('data-preview-viewport', 'desktop');
    await expect(preview.locator('[data-preview-device="desktop"]')).toBeVisible();

    await page.getByRole('button', { name: 'Ponsel' }).click();
    await expect(preview).toHaveAttribute('data-preview-viewport', 'mobile');

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(hasHorizontalOverflow).toBe(false);
  });
});
