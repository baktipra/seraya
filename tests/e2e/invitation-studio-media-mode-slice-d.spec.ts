import { expect, test } from '@playwright/test';

const firstImageId = '11111111-1111-4111-8111-111111111111';
const secondImageId = '22222222-2222-4222-8222-222222222222';

test.describe('Invitation Studio Slice D Media Mode', () => {
  test('reorders gallery assets through media authority without creating content dirtiness', async ({
    page,
  }) => {
    await page.route('**/api/projects/**/gallery/reorder', async (route) => {
      await route.fulfill({
        body: JSON.stringify({ status: 'ok' }),
        contentType: 'application/json',
        status: 200,
      });
    });
    await page.goto('/invitation-studio-slice-d?mode=media');

    const studio = page.locator('[data-invitation-studio]');
    const galleryManager = page.locator('[data-invitation-studio-gallery-manager="embedded"]');
    const saveState = page.locator('[data-invitation-studio-save-state]');

    await expect(studio).toHaveAttribute('data-invitation-studio-active-mode', 'media');
    await expect(page.locator('[data-invitation-studio-media-mode="canonical"]')).toBeVisible();
    await expect(page.locator('[data-invitation-studio-save-action]')).toHaveCount(1);
    await expect(saveState).toHaveAttribute('data-invitation-studio-save-state', 'clean');

    await galleryManager.getByRole('button', { name: 'Turunkan foto 1' }).click();
    await expect(galleryManager.locator('[data-gallery-image-id]').first()).toHaveAttribute(
      'data-gallery-image-id',
      secondImageId,
    );
    await expect(saveState).toHaveAttribute('data-invitation-studio-save-state', 'clean');

    await page.getByRole('tab', { name: /^Isi/ }).click();
    await expect(page.locator('[data-slice-d-gallery-order]')).toHaveText(
      `${secondImageId},${firstImageId}`,
    );
  });

  test('removes audio immediately and synchronizes the shared draft without a second save action', async ({
    page,
  }) => {
    await page.route('**/api/projects/**/audio/remove', async (route) => {
      await route.fulfill({
        body: JSON.stringify({ status: 'ok' }),
        contentType: 'application/json',
        status: 200,
      });
    });
    await page.goto('/invitation-studio-slice-d?mode=media');

    await page.getByRole('tab', { name: /^Audio/ }).click();
    const audioManager = page.locator('[data-invitation-studio-audio-manager="embedded"]');
    await expect(audioManager.getByText('lagu-kita.mp3')).toBeVisible();
    await audioManager.getByRole('button', { name: 'Hapus' }).click();

    await expect(page.locator('[data-media-audio-summary]')).toHaveText('Belum ada audio');
    await expect(page.locator('[data-invitation-studio-save-state]')).toHaveAttribute(
      'data-invitation-studio-save-state',
      'clean',
    );
    await expect(page.locator('[data-invitation-studio-save-action]')).toHaveCount(1);

    await page.getByRole('tab', { name: /^Isi/ }).click();
    await expect(page.locator('[data-slice-d-audio-id]')).toHaveText('none');
  });

  test('keeps gallery visibility under the Studio save command and avoids page overflow', async ({
    page,
  }) => {
    await page.goto('/invitation-studio-slice-d?mode=media');

    await page.getByRole('tab', { name: /^Isi/ }).click();
    await expect(page.locator('[data-slice-d-gallery-enabled]')).toHaveText('true');
    await page.locator('[data-slice-d-toggle-gallery]').click();
    await expect(page.locator('[data-slice-d-gallery-enabled]')).toHaveText('false');
    await expect(page.locator('[data-invitation-studio-save-state]')).toHaveAttribute(
      'data-invitation-studio-save-state',
      'dirty',
    );

    await page.locator('[data-invitation-studio-save-action]').click();
    await expect(page.locator('[data-invitation-studio-save-state]')).toHaveAttribute(
      'data-invitation-studio-save-state',
      'saved',
    );
    await expect(page.getByText('Semua perubahan tersimpan')).toBeVisible();

    await page.getByRole('tab', { name: /^Media/ }).click();
    await expect(page.locator('[data-media-gallery-summary]')).toHaveText('2 foto aktif');
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(hasHorizontalOverflow).toBe(false);
  });
});
