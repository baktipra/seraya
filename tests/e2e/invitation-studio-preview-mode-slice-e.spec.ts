import { expect, test } from '@playwright/test';

const previewSelector = '[data-invitation-studio-preview-mode="canonical"]';

function getPreviewRenderer(page: import('@playwright/test').Page) {
  return page.locator(`${previewSelector} [data-template]`);
}

test.describe('Invitation Studio Slice E Preview Mode', () => {
  test('keeps local, saved, and published renderer truth separate', async ({ page }) => {
    await page.goto('/invitation-studio-slice-e?mode=preview&version=local');

    const previewMode = page.locator(previewSelector);
    const previewHeader = previewMode.locator(':scope > header');
    const renderer = getPreviewRenderer(page);

    await expect(previewMode).toHaveAttribute('data-preview-version', 'local');
    await expect(renderer.getByText('Draf tersimpan Nadia & Raka')).toBeVisible();
    await expect(page.locator('[data-invitation-studio-save-action]')).toHaveCount(1);

    await page.getByRole('tab', { name: /^Isi/ }).click();
    await page.getByRole('button', { name: 'Ubah judul lokal' }).click();
    await expect(page.locator('[data-invitation-studio-save-state]')).toHaveAttribute(
      'data-invitation-studio-save-state',
      'dirty',
    );

    await page.getByRole('tab', { name: /^Preview/ }).click();
    await expect(previewMode).toHaveAttribute('data-preview-version', 'local');
    await expect(renderer.getByText('Perubahan lokal Nadia & Raka')).toBeVisible();
    await expect(
      previewHeader.getByText('Perubahan lokal belum tersimpan', { exact: true }),
    ).toBeVisible();

    await page.getByRole('radio', { name: /Draf tersimpan/ }).click();
    await expect(previewMode).toHaveAttribute('data-preview-version', 'saved');
    await expect(renderer.getByText('Draf tersimpan Nadia & Raka')).toBeVisible();
    await expect(renderer.getByText('Perubahan lokal Nadia & Raka')).toHaveCount(0);

    await page.getByRole('radio', { name: /Versi terbit/ }).click();
    await expect(previewMode).toHaveAttribute('data-preview-version', 'published');
    await expect(renderer.getByText('Versi terbit Nadia & Raka')).toBeVisible();
    await expect(previewHeader.getByText('Versi terbit · Revisi 3', { exact: true })).toBeVisible();

    await page.goBack();
    await expect(previewMode).toHaveAttribute('data-preview-version', 'saved');
    await expect(renderer.getByText('Draf tersimpan Nadia & Raka')).toBeVisible();
  });

  test('simulates personal experience without creating guest data', async ({ page }) => {
    const mutationRequests: string[] = [];
    page.on('request', (request) => {
      if (request.method() !== 'GET') mutationRequests.push(request.url());
    });

    await page.goto('/invitation-studio-slice-e?mode=preview&surface=generic&viewport=mobile');

    const previewMode = page.locator(previewSelector);
    await page.getByRole('button', { name: 'Simulasi personal' }).click();
    await expect(previewMode).toHaveAttribute('data-preview-surface', 'personal');
    await expect(page.locator('[data-invitation-preview-personal-slot="greeting"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hadir', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Kirim ucapan', exact: true })).toBeDisabled();

    await page.getByRole('button', { name: 'Desktop', exact: true }).click();
    await expect(previewMode).toHaveAttribute('data-preview-viewport', 'desktop');
    await expect(page.locator('[data-preview-device="desktop"]')).toBeVisible();
    await expect(page).toHaveURL(/mode=preview/);
    await expect(page).toHaveURL(/surface=personal/);
    await expect(page).toHaveURL(/viewport=desktop/);

    expect(mutationRequests).toEqual([]);
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(hasHorizontalOverflow).toBe(false);
  });

  test('falls back to saved truth when no published snapshot exists', async ({ page }) => {
    await page.goto(
      '/invitation-studio-slice-e?mode=preview&version=published&published=0&viewport=mobile',
    );

    const previewMode = page.locator(previewSelector);
    const renderer = getPreviewRenderer(page);

    await expect(previewMode).toHaveAttribute('data-preview-version', 'saved');
    await expect(renderer.getByText('Draf tersimpan Nadia & Raka')).toBeVisible();
    await expect(page.getByRole('radio', { name: /Versi terbit/ })).toBeDisabled();
    await expect(page.getByRole('link', { name: 'Buka undangan terbit' })).toHaveCount(0);
    await expect(page.locator('[data-invitation-studio-save-action]')).toHaveCount(1);
  });
});
