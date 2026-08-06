import { expect, test } from '@playwright/test';

test.describe('Seraya Owner Workspace Usability Reset V1', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/owner-workspace-usability-reset');
  });

  test('opens as a full-width task launcher with one save authority', async ({ page }) => {
    const workspace = page.locator('[data-invitation-task-workspace]');

    await expect(workspace).toHaveAttribute('data-invitation-task-workspace-active', 'launcher');
    await expect(page.locator('[data-workspace-task]')).toHaveCount(11);
    await expect(page.locator('[data-invitation-task-save-action]')).toHaveCount(1);
    await expect(page.getByText('Isi undangan', { exact: true })).toBeVisible();
    await expect(page.getByText('Tampilan & media', { exact: true })).toBeVisible();
    await expect(page.getByText('Periksa & terbitkan', { exact: true })).toBeVisible();

    const dimensions = await workspace.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return {
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
        workspaceWidth: rect.width,
      };
    });

    expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth + 1);
    expect(dimensions.workspaceWidth).toBeGreaterThan(dimensions.viewportWidth * 0.88);
  });

  test('keeps unsaved content alive while moving between single-task editors', async ({ page }) => {
    await page.locator('[data-workspace-task="couple"]').click();
    await expect(page).toHaveURL(/task=couple/);
    await expect(page.getByRole('heading', { level: 1, name: 'Mempelai' })).toBeVisible();

    const firstName = page.getByLabel('Nama yang tampil di undangan').first();
    await firstName.fill('Alya Prameswari Putri');
    await expect(page.getByText('Belum tersimpan', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Kembali ke Undangan' }).click();
    await page.locator('[data-workspace-task="schedule"]').click();
    await expect(page.getByRole('heading', { level: 1, name: 'Acara' })).toBeVisible();

    await page.getByRole('button', { name: 'Kembali ke Undangan' }).click();
    await page.locator('[data-workspace-task="couple"]').click();
    await expect(firstName).toHaveValue('Alya Prameswari Putri');

    await page.locator('[data-invitation-task-save-action]').click();
    await expect(page.getByText('Semua perubahan tersimpan', { exact: true })).toBeVisible();
  });

  test('opens focused experience tasks and preserves browser history', async ({ page }) => {
    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    await expect(page).toHaveURL(/task=preview/);
    await expect(page.locator('[data-fixture-task="preview"]')).toBeVisible();

    await page.getByRole('button', { name: 'Kembali ke Undangan' }).click();
    await expect(page.locator('[data-invitation-task-workspace]')).toHaveAttribute(
      'data-invitation-task-workspace-active',
      'launcher',
    );

    await page.goBack();
    await expect(page.locator('[data-fixture-task="preview"]')).toBeVisible();
  });

  test('keeps task cards and commands inside the viewport on compact screens', async ({ page }) => {
    await page.locator('[data-workspace-task="publish"]').scrollIntoViewIfNeeded();
    await expect(page.locator('[data-workspace-task="publish"]')).toBeVisible();

    await page.locator('[data-workspace-task="publish"]').click();
    await expect(page.locator('[data-fixture-task="terbitkan"]')).toBeVisible();
    await expect(page.locator('[data-invitation-task-save-action]')).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
