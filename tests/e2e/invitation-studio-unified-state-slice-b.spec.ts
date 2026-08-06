import { expect, test } from '@playwright/test';

test.describe('Invitation Studio Slice B unified state and command authority', () => {
  test('retains one dirty draft across every mode and saves from one header action', async ({
    page,
  }) => {
    await page.goto('/invitation-studio-slice-b');

    const input = page.locator('[data-slice-b-title-input]');
    const saveAction = page.locator('[data-invitation-studio-save-action]');
    const saveState = page.locator('[data-invitation-studio-save-state]');

    await expect(saveAction).toHaveCount(1);
    await expect(saveAction).toBeDisabled();
    await input.fill('Undangan Nadia & Raka — Draft Baru');

    await expect(saveState).toHaveAttribute('data-invitation-studio-save-state', 'dirty');
    await expect(saveAction).toBeEnabled();

    for (const mode of ['Desain', 'Media', 'Preview', 'Terbitkan', 'Isi']) {
      await page.getByRole('tab', { name: new RegExp(`^${mode}`) }).click();
    }

    await expect(input).toHaveValue('Undangan Nadia & Raka — Draft Baru');
    await expect(saveAction).toHaveCount(1);

    await saveAction.click();

    await expect(saveState).toHaveAttribute('data-invitation-studio-save-state', 'saved');
    await expect(page.getByText('Semua perubahan tersimpan')).toBeVisible();
    await expect(saveAction).toBeDisabled();
    await expect(page.getByText('Tersimpan', { exact: true })).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(hasHorizontalOverflow).toBe(false);
  });

  test('keeps local input after a failed save and exposes the same retry authority', async ({
    page,
  }) => {
    await page.goto('/invitation-studio-slice-b');

    const input = page.locator('[data-slice-b-title-input]');
    const saveAction = page.locator('[data-invitation-studio-save-action]');
    const saveState = page.locator('[data-invitation-studio-save-state]');

    await input.fill('Gagal disimpan tetapi tetap aman');
    await saveAction.click();

    await expect(saveState).toHaveAttribute('data-invitation-studio-save-state', 'error');
    await expect(saveAction).toHaveText('Coba simpan lagi');
    await expect(input).toHaveValue('Gagal disimpan tetapi tetap aman');
    await expect(page.getByRole('alert')).toContainText('Perubahan lokal tetap aman');
    await expect(saveAction).toHaveCount(1);
  });

  test('guards a dirty draft when the owner leaves the studio', async ({ page }) => {
    await page.goto('/invitation-studio-slice-b');
    await page.locator('[data-slice-b-title-input]').fill('Perubahan belum tersimpan');

    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm');
      expect(dialog.message()).toContain('Perubahan undangan belum disimpan');
      await dialog.dismiss();
    });

    await page.locator('[data-slice-b-leave-link]').click();
    await expect(page).toHaveURL(/invitation-studio-slice-b/);
    await expect(page.locator('[data-slice-b-title-input]')).toHaveValue(
      'Perubahan belum tersimpan',
    );
  });

  test('opens a direct mode query while preserving the shared provider', async ({ page }) => {
    await page.goto('/invitation-studio-slice-b?mode=preview');

    await expect(page.locator('[data-invitation-studio]')).toHaveAttribute(
      'data-invitation-studio-active-mode',
      'preview',
    );
    await expect(page.locator('[data-invitation-studio-save-action]')).toHaveCount(1);
  });
});
