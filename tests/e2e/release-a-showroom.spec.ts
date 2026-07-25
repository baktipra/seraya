import { expect, test } from '@playwright/test';

test('shows the guided collection step and canonical five-item workspace in preview', async ({
  isMobile,
  page,
}) => {
  await page.goto('/release-a-preview');

  await expect(page.getByRole('heading', { name: 'Guided project creation' })).toBeVisible();

  const guidedForm = page.locator('form[data-guided-project-setup="true"]');
  const firstNameInput = page.getByLabel('Nama panggilan pertama');

  await expect(firstNameInput).toBeVisible();
  await firstNameInput.click();
  await expect(guidedForm).toHaveAttribute('data-interactive', 'true');

  await firstNameInput.fill('Mira');
  await page.getByLabel('Nama panggilan kedua').fill('Arga');
  await page.getByLabel('Tanggal acara utama').fill('2027-08-17');
  await page.getByLabel('Kota acara').fill('Jakarta');
  await page.getByRole('button', { name: 'Pilih pengalaman' }).click();

  await expect(page.getByRole('heading', { name: 'Pilih rasa yang paling dekat.' })).toBeVisible();
  await expect(page.getByRole('radio', { name: /Roselle/ })).toBeChecked();
  await expect(page.getByRole('radio', { name: /Aruna/ })).toBeEnabled();
  await expect(page.getByRole('radio', { name: /Laras/ })).toBeEnabled();

  await page.getByRole('radio', { name: /Aruna/ }).check();
  await expect(page.getByRole('radio', { name: /Aruna/ })).toBeChecked();
  await expect(page.locator('[data-template="aruna"]')).toBeVisible();

  const navigationName = isMobile ? 'Navigasi workspace mobile' : 'Navigasi workspace';
  const workspaceNavigation = page.getByRole('navigation', {
    exact: true,
    name: navigationName,
  });

  await expect(workspaceNavigation).toBeVisible();
  await expect(workspaceNavigation.getByRole('link')).toHaveCount(5);
  await expect(workspaceNavigation).toContainText(isMobile ? 'Ringkas' : 'Ringkasan');
  await expect(workspaceNavigation).toContainText('Undangan');
  await expect(workspaceNavigation).toContainText('Tamu');
  await expect(workspaceNavigation).toContainText('Bagikan');
  await expect(workspaceNavigation).toContainText(isMobile ? 'Respons' : 'Respons Tamu');
  await expect(workspaceNavigation).not.toContainText('Tindak Lanjut');
});
