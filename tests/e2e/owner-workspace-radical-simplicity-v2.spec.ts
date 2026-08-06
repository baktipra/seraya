import { expect, test, type Page } from '@playwright/test';

const projectPath = '/owner-workspace-radical-simplicity-v2';
const invitationPath = `${projectPath}?view=invitation`;

async function expectNoDocumentOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

test.describe('SERAYA Owner Workspace Radical Simplicity Reset V2', () => {
  test('project start presents exactly three clear owner choices', async ({ page }) => {
    await page.goto(projectPath);

    const workspace = page.locator('[data-owner-workspace-radical-simplicity="v2"]');
    await expect(workspace).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Mau mengerjakan apa sekarang?' })).toBeVisible();

    const entryLinks = workspace.locator('a');
    await expect(entryLinks).toHaveCount(4);
    await expect(page.getByRole('link', { name: /Edit undangan/ })).toHaveCount(1);
    await expect(page.getByRole('link', { name: /Kelola tamu/ })).toHaveCount(1);
    await expect(page.getByRole('link', { name: /Lihat respons/ })).toHaveCount(1);
    await expect(page.getByRole('link', { name: /Siapkan pembagian/ })).toHaveCount(1);

    await expect(workspace.locator('[data-canonical-thumbnail-template="roselle"]')).toBeVisible();
    await expect(workspace.getByText('Ringkasan', { exact: true })).toHaveCount(0);
    await expect(workspace.getByText('Bagikan', { exact: true })).toHaveCount(0);
    await expectNoDocumentOverflow(page);
  });

  test('owner workspace uses operational sans typography', async ({ page }) => {
    await page.goto(projectPath);

    const dashboard = page.locator('[data-owner-workspace-typography="sans"]');
    await expect(dashboard).toBeVisible();

    const fontFamily = await dashboard.evaluate((element) => getComputedStyle(element).fontFamily);
    expect(fontFamily.toLowerCase()).not.toContain('cormorant');
    expect(fontFamily.toLowerCase()).not.toContain('baskerville');
    expect(fontFamily.toLowerCase()).not.toContain('times new roman');
  });

  test('invitation launcher prioritizes one next task and keeps one save authority', async ({
    page,
  }) => {
    await page.goto(invitationPath);

    const workspace = page.locator('[data-invitation-task-workspace]');
    await expect(workspace).toHaveAttribute('data-owner-workspace-radical-simplicity', 'v2');
    await expect(page.getByText('Lanjutkan di sini', { exact: true })).toBeVisible();
    await expect(workspace.locator('[data-invitation-task-save-action]')).toHaveCount(1);
    await expect(workspace.locator('[data-workspace-task]')).toHaveCount(11);
    await expect(workspace.locator('[data-workspace-task] svg')).toHaveCount(11);

    const recommendedButton = workspace.locator('[data-recommended-task]');
    const recommendedTask = await recommendedButton.getAttribute('data-recommended-task');
    expect(recommendedTask).toBeTruthy();

    await recommendedButton.click();
    await expect(workspace).toHaveAttribute(
      'data-invitation-task-workspace-active',
      recommendedTask!,
    );
    await expect(workspace.getByRole('button', { name: /Semua bagian/ })).toBeVisible();
    await expectNoDocumentOverflow(page);
  });

  test('task launcher remains scannable after returning from a single task', async ({ page }) => {
    await page.goto(invitationPath);

    const workspace = page.locator('[data-invitation-task-workspace]');
    await workspace.locator('[data-workspace-task="schedule"]').click();
    await expect(workspace).toHaveAttribute('data-invitation-task-workspace-active', 'schedule');

    await workspace.getByRole('button', { name: /Semua bagian/ }).click();
    await expect(workspace).toHaveAttribute('data-invitation-task-workspace-active', 'launcher');
    await expect(workspace.locator('[data-workspace-task]')).toHaveCount(11);
    await expect(page.getByRole('heading', { name: 'Isi undangan' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Tampilan & media' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Selesaikan' })).toBeVisible();
    await expectNoDocumentOverflow(page);
  });
});
