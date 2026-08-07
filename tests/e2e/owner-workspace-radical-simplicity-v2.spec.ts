import { expect, test, type Page } from '@playwright/test';

const projectPath = '/dashboard/editorial-v3';
const invitationPath = `${projectPath}?view=invitation`;

async function expectNoDocumentOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

test.describe('SERAYA Owner Workspace Editorial Dashboard V3 + Invitation Workspace Editorial V1', () => {
  test('project root shows the five-area shell and readiness dashboard', async ({ page }) => {
    await page.goto(projectPath);

    const shell = page.locator('[data-owner-workspace-navigation="editorial-five-area"]');
    await expect(shell).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Selamat datang kembali, Nadia & Farhan' }),
    ).toBeVisible();

    for (const label of ['Status undangan', 'Tamu aktif', 'Respons masuk', 'Siap dibagikan']) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }

    await expect(page.getByRole('heading', { name: 'Perjalanan proyek' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Langkah berikutnya' })).toBeVisible();

    const sidebarLabels = await page.locator('[data-project-sidebar] a').allTextContents();
    for (const label of ['Ringkasan', 'Undangan', 'Tamu', 'Bagikan', 'Respons Tamu']) {
      expect(sidebarLabels.some((text) => text.includes(label))).toBe(true);
    }

    const viewport = page.viewportSize();
    if (viewport && viewport.width >= 1024) {
      await expect(page.locator('[data-project-sidebar]')).toBeVisible();
    } else {
      await expect(page.locator('[data-project-mobile-context]')).toBeVisible();
      await page.getByRole('button', { name: 'Buka navigasi proyek' }).click();
      const drawer = page.getByRole('complementary', { name: 'Navigasi proyek' });
      await expect(drawer).toBeVisible();
      await drawer.getByRole('button', { name: 'Tutup navigasi proyek' }).click();
    }

    await expectNoDocumentOverflow(page);
  });

  test('editorial hierarchy stays separate from operational typography', async ({ page }) => {
    await page.goto(projectPath);

    const shell = page.locator('[data-owner-workspace-typography="editorial-operations"]');
    await expect(shell).toBeVisible();

    const titleFont = await page
      .getByRole('heading', { name: 'Selamat datang kembali, Nadia & Farhan' })
      .evaluate((element) => getComputedStyle(element).fontFamily);
    const bodyFont = await shell.evaluate((element) => getComputedStyle(element).fontFamily);

    expect(titleFont).not.toBe(bodyFont);
    expect(bodyFont.toLowerCase()).not.toContain('fraunces');
    expect(bodyFont.toLowerCase()).not.toContain('times new roman');
    await expectNoDocumentOverflow(page);
  });

  test('Undangan opens directly as the eleven-section editor with a persistent preview', async ({
    page,
  }) => {
    await page.goto(invitationPath);

    const workspace = page.locator('[data-invitation-workspace-editorial="v1"]');
    await expect(workspace).toBeVisible();
    await expect(workspace.locator('[data-workspace-task]')).toHaveCount(0);
    await expect(page.getByText('Lanjutkan di sini', { exact: true })).toHaveCount(0);

    const sectionRail = page.getByRole('navigation', { name: 'Bagian undangan' });
    const labels = [
      'Tema',
      'Pasangan',
      'Pembuka',
      'Acara',
      'Lokasi & Peta',
      'Cerita',
      'Galeri',
      'Musik',
      'Amplop Digital',
      'RSVP',
      'Penutup',
    ];
    await expect(sectionRail.getByRole('button')).toHaveCount(labels.length);
    for (const label of labels) {
      await expect(sectionRail.getByRole('button', { name: label, exact: true })).toBeVisible();
    }

    await expect(workspace.locator('[data-invitation-editorial-editor]')).toBeVisible();
    await expect(workspace.locator('[data-invitation-editorial-preview]')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Draf' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tab', { name: 'Versi Tamu' })).toBeDisabled();
    await expect(workspace.locator('[data-invitation-task-save-action]')).toHaveCount(0);
    await expectNoDocumentOverflow(page);
  });

  test('section switching preserves local editor state and uses one save authority', async ({
    page,
  }) => {
    await page.goto(invitationPath);

    const workspace = page.locator('[data-invitation-workspace-editorial="v1"]');
    const sectionRail = page.getByRole('navigation', { name: 'Bagian undangan' });

    await sectionRail.getByRole('button', { name: 'Pasangan', exact: true }).click();
    await expect(workspace).toHaveAttribute('data-invitation-task-workspace-active', 'couple');
    await expect(page.getByRole('heading', { name: 'Mempelai' })).toBeVisible();

    const personOne = page.getByLabel('Nama yang tampil di undangan').first();
    await personOne.fill('Nama Lokal Tetap');
    await expect(workspace.locator('[data-invitation-task-save-action]')).toHaveCount(1);

    await sectionRail.getByRole('button', { name: 'Penutup', exact: true }).click();
    await expect(workspace).toHaveAttribute('data-invitation-task-workspace-active', 'closing');
    await expect(page.getByRole('heading', { name: 'Penutup' })).toBeVisible();

    await sectionRail.getByRole('button', { name: 'Pasangan', exact: true }).click();
    await expect(personOne).toHaveValue('Nama Lokal Tetap');

    const saveButton = workspace.locator('[data-invitation-task-save-action]');
    await expect(saveButton).toHaveCount(1);
    await saveButton.click();
    await expect(page.getByText('Semua perubahan tersimpan', { exact: true })).toBeVisible();
    await expectNoDocumentOverflow(page);
  });

  test('editorial rail stays usable across location, gallery, music and responsive owner navigation', async ({
    page,
  }) => {
    await page.goto(invitationPath);

    const workspace = page.locator('[data-invitation-workspace-editorial="v1"]');
    const sectionRail = page.getByRole('navigation', { name: 'Bagian undangan' });

    await sectionRail.getByRole('button', { name: 'Lokasi & Peta', exact: true }).click();
    await expect(page.getByText('Lokasi mengikuti setiap acara.', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Rangkaian Acara' })).toBeVisible();

    await sectionRail.getByRole('button', { name: 'Galeri', exact: true }).click();
    await expect(workspace.locator('[data-fixture-task="galeri"]')).toBeVisible();

    await sectionRail.getByRole('button', { name: 'Musik', exact: true }).click();
    await expect(workspace.locator('[data-fixture-task="musik"]')).toBeVisible();

    const viewport = page.viewportSize();
    if (viewport && viewport.width < 1024) {
      await page.getByRole('button', { name: 'Buka navigasi proyek' }).click();
      const drawer = page.getByRole('complementary', { name: 'Navigasi proyek' });
      await expect(drawer).toBeVisible();
      await drawer.getByRole('button', { name: 'Tutup navigasi proyek' }).click();
      await expect(drawer).toBeHidden();
    } else {
      await expect(page.locator('[data-project-sidebar]')).toBeVisible();
    }

    await expectNoDocumentOverflow(page);
  });
});
