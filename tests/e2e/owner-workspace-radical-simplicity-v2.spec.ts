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

test.describe('SERAYA Owner Dashboard Cognitive Compression V1', () => {
  test('project root exposes one priority action and a compact readiness pulse', async ({
    page,
  }) => {
    await page.goto(projectPath);

    const shell = page.locator('[data-owner-workspace-navigation="editorial-five-area"]');
    const title = page.getByRole('heading', { name: 'Selamat datang kembali, Nadia & Farhan' });
    const priorityAction = page.locator('[data-owner-priority-action]');

    await expect(shell).toBeVisible();
    await expect(title).toBeVisible();
    await expect(title).toBeInViewport();
    await expect(priorityAction).toHaveCount(1);
    await expect(priorityAction).toBeVisible();
    await expect(priorityAction).toBeInViewport();
    await expect(page.getByRole('heading', { name: 'Lengkapi isi undangan' })).toBeVisible();
    await expect(page.getByText('Perjalanan proyek', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Langkah berikutnya', { exact: true })).toHaveCount(0);

    for (const label of ['Status undangan', 'Tamu aktif', 'Respons masuk', 'Siap dibagikan']) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }

    const sidebarLabels = await page.locator('[data-project-sidebar] a').allTextContents();
    for (const label of ['Ringkasan', 'Undangan', 'Tamu', 'Bagikan', 'Respons Tamu']) {
      expect(sidebarLabels.some((text) => text.includes(label))).toBe(true);
    }

    const viewport = page.viewportSize();
    if (viewport && viewport.width >= 1024) {
      await expect(page.locator('[data-project-sidebar]')).toBeVisible();
    } else {
      const trigger = page.getByRole('button', { name: 'Buka navigasi proyek' });
      await expect(page.locator('[data-project-mobile-context]')).toBeVisible();
      await trigger.click();

      const drawer = page.getByRole('dialog', { name: 'Navigasi proyek' });
      await expect(drawer).toBeVisible();
      await expect(drawer.getByRole('button', { name: 'Tutup navigasi proyek' })).toBeFocused();

      await page.keyboard.press('Escape');
      await expect(drawer).toHaveCount(0);
      await expect(trigger).toBeFocused();
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

  test('invitation persistent editor keeps one save authority and focused section rail', async ({
    page,
  }) => {
    await page.goto(invitationPath);

    const workspace = page.locator('[data-invitation-task-workspace]');
    const rail = page.getByRole('navigation', { name: 'Bagian editor undangan' });

    await expect(workspace).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Undangan', level: 1 })).toBeVisible();
    await expect(workspace.locator('[data-invitation-task-save-action]')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Lihat hasil' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Terbitkan' })).toBeVisible();
    await expect(rail.getByRole('button')).toHaveCount(9);
    await expect(workspace).toHaveAttribute('data-invitation-task-workspace-active', 'design');
    await expect(
      page.getByRole('heading', { name: 'Tema & warna', level: 2, exact: true }),
    ).toBeVisible();
    await expectNoDocumentOverflow(page);
  });

  test('persistent editor rail switches focused sections without recreating the workspace', async ({
    page,
  }) => {
    await page.goto(invitationPath);

    const workspace = page.locator('[data-invitation-task-workspace]');
    const rail = page.getByRole('navigation', { name: 'Bagian editor undangan' });

    await rail.getByRole('button', { name: 'Acara & lokasi' }).click();
    await expect(workspace).toHaveAttribute('data-invitation-task-workspace-active', 'schedule');
    await expect(page.getByRole('heading', { name: 'Acara & lokasi', level: 2 })).toBeVisible();

    await rail.getByRole('button', { name: 'Tema' }).click();
    await expect(workspace).toHaveAttribute('data-invitation-task-workspace-active', 'design');
    await expect(
      page.getByRole('heading', { name: 'Tema & warna', level: 2, exact: true }),
    ).toBeVisible();
    await expect(workspace.locator('[data-invitation-task-save-action]')).toHaveCount(1);
    await expectNoDocumentOverflow(page);
  });
});
