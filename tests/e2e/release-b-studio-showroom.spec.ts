import { expect, test } from '@playwright/test';

test('keeps edit truth and exact public/personal preview modes coherent', async ({ page }) => {
  await page.goto('/release-b-studio-preview');

  await expect(
    page.getByRole('heading', {
      name: 'Studio undangan yang membedakan edit, simpan, dan terbit.',
    }),
  ).toBeVisible();
  await expect(page.locator('[data-editor-truth="local"]')).toContainText(
    'Tidak ada perubahan',
  );
  await expect(page.locator('[data-editor-truth="saved"]')).toContainText('Draf tersimpan');
  await expect(page.locator('[data-editor-truth="published"]')).toContainText(
    'Belum diterbitkan',
  );

  await page.locator('[data-editor-chapter="opening"]:visible').click();
  const titleInput = page.getByLabel('Judul utama undangan');
  await expect(titleInput).toBeVisible();
  await titleInput.fill('Mira & Arga — Hari Bahagia');

  await expect(page.locator('[data-editor-truth="local"]')).toContainText('Ada perubahan');
  await expect(page.locator('[data-editor-truth="saved"]')).toContainText('Versi sebelumnya');

  await page.locator('[data-local-preview-trigger="true"]:visible').click();
  const previewDialog = page.getByRole('dialog', { name: 'Pratinjau langsung' });
  await expect(previewDialog).toBeVisible();
  await expect(previewDialog).toHaveAttribute('data-preview-surface', 'public');
  await expect(previewDialog.locator('[data-surface="generic"]')).toBeVisible();
  await expect(previewDialog.locator('[data-personal-response-form]')).toHaveCount(0);

  await previewDialog.getByRole('button', { name: 'Personal', exact: true }).click();
  await expect(previewDialog).toHaveAttribute('data-preview-surface', 'personal');
  await expect(previewDialog.locator('[data-surface="personal"]')).toBeVisible();
  await expect(previewDialog.locator('[data-personal-response-form]')).toHaveCount(2);
  await expect(previewDialog.getByText(/Mode pratinjau/).first()).toBeVisible();

  await previewDialog.getByRole('button', { name: 'Desktop', exact: true }).click();
  await expect(previewDialog).toHaveAttribute('data-preview-viewport', 'desktop');
  await expect(page).toHaveURL(/release-b-studio-preview/);
});
