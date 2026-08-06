import { expect, test } from '@playwright/test';

const publishModeSelector = '[data-invitation-studio-publish-mode="canonical"]';

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(hasHorizontalOverflow).toBe(false);
}

test.describe('Invitation Studio Slice F Publish Mode', () => {
  test('prioritizes local save and keeps readiness out of Isi mode', async ({ page }) => {
    await page.goto('/invitation-studio-slice-f?mode=publish&state=ready_to_publish');

    const publishMode = page.locator(publishModeSelector);
    await expect(publishMode).toHaveAttribute('data-publish-decision', 'publish-first');
    await expect(page.locator('[data-primary-publication-decision]')).toHaveCount(1);
    await expect(page.locator('[data-invitation-studio-save-action]')).toHaveCount(1);

    await page.getByRole('tab', { name: /^Isi/ }).click();
    await expect(publishMode).toBeHidden();
    await expect(page.locator('[data-slice-f-content-mode]')).toBeVisible();

    await page.getByRole('button', { name: 'Buat perubahan lokal' }).click();
    await expect(page.locator('[data-invitation-studio-save-state]')).toHaveAttribute(
      'data-invitation-studio-save-state',
      'dirty',
    );

    await page.getByRole('tab', { name: /^Terbitkan/ }).click();
    await expect(publishMode).toHaveAttribute('data-publish-decision', 'save-local');
    await expect(page.locator('[data-publish-header-save-handoff]')).toBeVisible();
    await expect(publishMode.locator('[aria-label="Kontrol penerbitan undangan"]')).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });

  test('routes blocker, payment, and first publish through one decision surface', async ({
    page,
  }) => {
    await page.goto('/invitation-studio-slice-f?mode=publish&state=draft_incomplete');

    let publishMode = page.locator(publishModeSelector);
    await expect(publishMode).toHaveAttribute('data-publish-decision', 'fix-readiness');
    await expect(page.getByRole('link', { name: 'Lengkapi Sampul' })).toHaveAttribute(
      'href',
      '/dashboard/slice-f-project/invitation?mode=content#bagian-opening',
    );

    await page.goto('/invitation-studio-slice-f?mode=publish&state=draft_ready_unactivated');
    publishMode = page.locator(publishModeSelector);
    await expect(publishMode).toHaveAttribute('data-publish-decision', 'activate-payment');
    await expect(page.getByRole('link', { name: 'Selesaikan pembayaran' })).toHaveAttribute(
      'href',
      '/dashboard/slice-f-project/billing',
    );

    await page.goto('/invitation-studio-slice-f?mode=publish&state=ready_to_publish');
    publishMode = page.locator(publishModeSelector);
    await expect(publishMode).toHaveAttribute('data-publish-decision', 'publish-first');
    await page.getByRole('button', { name: 'Terbitkan undangan', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('Terbitkan undangan?');
    await expect(page.getByRole('dialog')).toContainText(
      'Link Publik dapat dibuka oleh tamu. Undangan Pribadi dapat disiapkan dari halaman Bagikan.',
    );
    await page.getByRole('button', { name: 'Batal', exact: true }).click();
    await expectNoHorizontalOverflow(page);
  });

  test('keeps republish link truth and exposes the refreshed published revision', async ({
    page,
  }) => {
    await page.goto(
      '/invitation-studio-slice-f?mode=publish&state=published_with_unpublished_changes&revision=3',
    );

    let publishMode = page.locator(publishModeSelector);
    await expect(publishMode).toHaveAttribute('data-publish-decision', 'republish');
    await expect(publishMode.getByText('Revisi 3', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Terbitkan perubahan', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('Terbitkan perubahan?');
    await expect(page.getByRole('dialog')).toContainText('Tautan tamu tidak berubah.');
    await page.getByRole('button', { name: 'Batal', exact: true }).click();

    await page.goto('/invitation-studio-slice-f?mode=publish&state=published&revision=4');
    publishMode = page.locator(publishModeSelector);
    await expect(publishMode).toHaveAttribute('data-publish-decision', 'open-published');
    await expect(publishMode.getByText('Revisi 4', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Buka undangan terbit' })).toHaveAttribute(
      'href',
      '/nadia-raka',
    );
    await expect(publishMode).toContainText(
      'Link tamu dan guest token tidak dibuat ulang. Seraya tidak menyatakan undangan sudah dikirim, dibuka, atau dibaca.',
    );
    await expectNoHorizontalOverflow(page);
  });
});
