import { expect, test } from '@playwright/test';

const states = [
  {
    expectedHeading: 'Beberapa akses tamu perlu ditinjau',
    expectedState: 'needs_attention',
    path: '/rc2-guest-control',
  },
  {
    expectedHeading: 'Akses tamu terkendali',
    expectedState: 'managed',
    path: '/rc2-guest-control?state=managed',
  },
  {
    expectedHeading: 'Belum ada tamu aktif',
    expectedState: 'no_guests',
    path: '/rc2-guest-control?state=empty',
  },
] as const;

for (const state of states) {
  test(`${state.expectedState} remains clear across desktop and mobile`, async ({ page }) => {
    await page.goto(state.path);

    const confidence = page.locator('[data-rc2-guest-control-confidence="v1"]');

    await expect(confidence).toBeVisible();
    await expect(confidence).toHaveAttribute('data-guest-control-state', state.expectedState);
    await expect(confidence.getByRole('heading', { name: state.expectedHeading })).toBeVisible();
    await expect(confidence.getByText('Tamu aktif', { exact: true })).toBeVisible();
    await expect(confidence.getByText('Link dapat dikelola', { exact: true })).toBeVisible();
    await expect(confidence.getByText('Belum mempunyai link', { exact: true })).toBeVisible();
    await expect(confidence.getByText('Perlu diperbarui', { exact: true })).toBeVisible();
    await expect(confidence.getByRole('link', { name: /Kelola di halaman Tamu/ })).toHaveAttribute(
      'href',
      '/dashboard/project-id/guests',
    );
    await expect(page.getByText('Versi tamu sinkron', { exact: true })).toBeVisible();
    await expect(page.getByText('Operasional setelah terbit', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Kelola tamu', exact: true })).toHaveCount(1);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
}
