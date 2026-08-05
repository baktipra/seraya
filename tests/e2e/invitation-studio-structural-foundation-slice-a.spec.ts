import { expect, test } from '@playwright/test';

test.describe('Invitation Studio Slice A structural foundation', () => {
  test('keeps one explicit mode canvas without overlap or horizontal overflow', async ({ page }) => {
    await page.goto('/invitation-studio-slice-a');

    const shell = page.locator('[data-invitation-studio]');
    const header = page.locator('[data-invitation-studio-header]');
    const navigation = page.locator('[data-invitation-studio-mode-navigation]');
    const contentPanel = page.locator('[data-invitation-studio-panel="content"]');
    const designPanel = page.locator('[data-invitation-studio-panel="design"]');

    await expect(shell).toHaveAttribute('data-invitation-studio-active-mode', 'content');
    await expect(contentPanel).toBeVisible();
    await expect(designPanel).toBeHidden();

    const headerBox = await header.boundingBox();
    const navigationBox = await navigation.boundingBox();
    const contentBox = await contentPanel.boundingBox();

    expect(headerBox).not.toBeNull();
    expect(navigationBox).not.toBeNull();
    expect(contentBox).not.toBeNull();
    expect(headerBox!.y + headerBox!.height).toBeLessThanOrEqual(navigationBox!.y + 1);
    expect(navigationBox!.y + navigationBox!.height).toBeLessThanOrEqual(contentBox!.y + 1);

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(hasHorizontalOverflow).toBe(false);

    await page.getByRole('tab', { name: /^Desain/ }).click();
    await expect(shell).toHaveAttribute('data-invitation-studio-active-mode', 'design');
    await expect(page).toHaveURL(/mode=design/);
    await expect(contentPanel).toBeHidden();
    await expect(designPanel).toBeVisible();

    await page.getByRole('tab', { name: /^Desain/ }).press('ArrowRight');
    await expect(shell).toHaveAttribute('data-invitation-studio-active-mode', 'media');
    await expect(page.getByRole('tab', { name: /^Media/ })).toBeFocused();
  });

  test('opens a direct mode query in the matching mounted panel', async ({ page }) => {
    await page.goto('/invitation-studio-slice-a?mode=preview');

    await expect(page.locator('[data-invitation-studio]')).toHaveAttribute(
      'data-invitation-studio-active-mode',
      'preview',
    );
    await expect(page.locator('[data-invitation-studio-panel="preview"]')).toBeVisible();
    await expect(page.locator('[data-invitation-studio-panel="content"]')).toBeHidden();
  });
});
