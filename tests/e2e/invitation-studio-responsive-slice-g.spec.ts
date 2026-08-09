import { expect, test, type Page } from '@playwright/test';

const modes = ['content', 'design', 'media', 'preview', 'publish'] as const;

async function expectNoDocumentOverflow(page: Page) {
  await expect
    .poll(async () =>
      page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      })),
    )
    .toEqual(
      expect.objectContaining({
        clientWidth: expect.any(Number),
        scrollWidth: expect.any(Number),
      }),
    );

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

async function openMode(page: Page, mode: (typeof modes)[number]) {
  await page.locator(`[data-invitation-studio-mode='${mode}']`).click();
  await expect(page.locator('[data-invitation-studio]')).toHaveAttribute(
    'data-invitation-studio-active-mode',
    mode,
  );
  await expect(page.locator(`[data-invitation-studio-panel='${mode}']`)).toBeVisible();
}

test.describe('Invitation Studio Slice G responsive polish', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/invitation-studio-slice-g?mode=content');
    await expect(page.locator('[data-invitation-studio-responsive="slice-g"]')).toBeVisible();
  });

  test('keeps all canonical modes inside the owner canvas with one save authority', async ({
    page,
  }) => {
    await expect(page.locator('[data-invitation-studio-save-action]')).toHaveCount(1);

    for (const mode of modes) {
      await openMode(page, mode);
      await expectNoDocumentOverflow(page);
    }

    await expect(page.locator('[data-invitation-studio-design-mode="canonical"]')).toHaveCount(1);
    await expect(page.locator('[data-invitation-studio-media-mode="canonical"]')).toHaveCount(1);
    await expect(page.locator('[data-invitation-studio-preview-mode="canonical"]')).toHaveCount(1);
    await expect(page.locator('[data-invitation-studio-publish-mode="canonical"]')).toHaveCount(1);
    await expect(page.locator('[data-primary-publication-decision]')).toHaveCount(1);
  });

  test('keeps active mode navigation visible and preserves keyboard mode movement', async ({
    page,
  }) => {
    await openMode(page, 'publish');

    await expect
      .poll(async () => {
        const tab = page.locator("[data-invitation-studio-mode='publish']");
        const navigation = page.locator('[data-invitation-studio-mode-navigation]');
        const tabBox = await tab.boundingBox();
        const navigationBox = await navigation.boundingBox();

        if (!tabBox || !navigationBox) return false;

        return (
          tabBox.x >= navigationBox.x - 1 &&
          tabBox.x + tabBox.width <= navigationBox.x + navigationBox.width + 1
        );
      })
      .toBe(true);

    const contentTab = page.locator("[data-invitation-studio-mode='content']");
    await contentTab.focus();
    await contentTab.press('ArrowRight');

    await expect(page.locator('[data-invitation-studio]')).toHaveAttribute(
      'data-invitation-studio-active-mode',
      'design',
    );
    await expect(page).toHaveURL(/mode=design/);
    await expect(page.locator("[data-invitation-studio-mode='design']")).toBeFocused();
  });

  test('keeps design, media, and preview controls responsive at their actual container width', async ({
    page,
  }) => {
    await openMode(page, 'design');
    await page.locator("input[name='templateKey']").nth(1).check();
    await expect(page.locator('[data-invitation-studio-save-action]')).toBeEnabled();
    await expect(page.locator('[data-invitation-studio-design-mode="canonical"]')).toBeVisible();
    await expectNoDocumentOverflow(page);

    await openMode(page, 'media');
    await page.getByRole('tab', { name: /Audio/ }).click();
    await expect(page.locator('#invitation-studio-media-audio-panel')).toBeVisible();
    await expectNoDocumentOverflow(page);

    await openMode(page, 'preview');
    await page.getByRole('button', { name: 'Simulasi personal' }).click();
    await page
      .getByRole('group', { name: 'Ukuran layar preview' })
      .getByRole('button', { name: 'Desktop' })
      .click();
    await expect(page.locator('[data-invitation-studio-preview-mode]')).toHaveAttribute(
      'data-preview-surface',
      'personal',
    );
    await expect(page.locator('[data-invitation-studio-preview-mode]')).toHaveAttribute(
      'data-preview-viewport',
      'desktop',
    );
    await expectNoDocumentOverflow(page);
  });

  test('preserves unsaved authority across mode switches and live viewport changes', async ({
    page,
  }) => {
    await openMode(page, 'design');
    await page.locator("input[name='templateKey']").nth(1).check();
    await expect(page.locator('[data-invitation-studio-save-action]')).toBeEnabled();
    await expect(page.locator('[data-invitation-studio-save-state="dirty"]')).toBeVisible();

    for (const viewport of [
      { height: 900, width: 1024 },
      { height: 900, width: 820 },
      { height: 915, width: 412 },
    ]) {
      await page.setViewportSize(viewport);
      await openMode(page, 'publish');
      await expect(page.locator('[data-invitation-studio-save-action]')).toHaveCount(1);
      await expect(page.locator('[data-invitation-studio-save-action]')).toBeEnabled();
      await expect(page.locator('[data-publish-decision="save-local"]')).toBeVisible();
      await expectNoDocumentOverflow(page);
      await openMode(page, 'design');
    }
  });
});
