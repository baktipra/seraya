import { expect, test } from '@playwright/test';

const states = [
  {
    expectedHeading: 'Versi tamu sinkron',
    expectedState: 'synchronized',
    path: '/rc1-published-confidence',
  },
  {
    expectedHeading: 'Versi terbit tetap aktif',
    expectedState: 'published-version-active',
    path: '/rc1-published-confidence?changes=1',
  },
] as const;

for (const state of states) {
  test(`${state.expectedState} remains clear and single-action`, async ({ page }) => {
    await page.goto(state.path);

    const confidence = page.locator('[data-rc1-published-confidence="slice-a"]');
    const main = page.locator('main');

    await expect(confidence).toBeVisible();
    await expect(confidence).toHaveAttribute(
      'data-published-confidence-state',
      state.expectedState,
    );
    await expect(confidence.getByRole('heading', { name: state.expectedHeading })).toBeVisible();
    await expect(confidence.getByText('Terbit', { exact: true })).toBeVisible();
    await expect(confidence.getByText('Tetap berlaku', { exact: true })).toBeVisible();
    await expect(page.getByText('Operasional setelah terbit', { exact: true })).toBeVisible();
    await expect(main.getByRole('link')).toHaveCount(1);
    await expect(main.getByRole('link', { name: /Kelola tamu/ })).toHaveAttribute(
      'href',
      '/rc1-published-confidence/guests',
    );

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
}
