import { expect, test } from '@playwright/test';

const routes = [
  { path: '/', heading: 'Undangan pernikahan yang terasa personal' },
  { path: '/templates', heading: /Pilih rasa/ },
] as const;

for (const route of routes) {
  test(`${route.path} uses the canonical centered marketing shell`, async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto(route.path);

    await expect(page.getByRole('heading', { level: 1, name: route.heading })).toBeVisible();
    const shell = page.locator('[data-marketing-page-shell]');
    await expect(shell).toBeVisible();

    const geometry = await page.evaluate(() => {
      const shellElement = document.querySelector<HTMLElement>('[data-marketing-page-shell]');
      const header = document.querySelector<HTMLElement>('header');
      const main = document.querySelector<HTMLElement>('main');
      const footer = document.querySelector<HTMLElement>('footer');
      const shellRect = shellElement?.getBoundingClientRect();
      const headerRect = header?.getBoundingClientRect();
      const mainRect = main?.getBoundingClientRect();
      const footerRect = footer?.getBoundingClientRect();

      return {
        footerLeft: footerRect?.left ?? null,
        footerRight: footerRect?.right ?? null,
        headerLeft: headerRect?.left ?? null,
        headerRight: headerRect?.right ?? null,
        mainLeft: mainRect?.left ?? null,
        mainRight: mainRect?.right ?? null,
        shellLeft: shellRect?.left ?? null,
        shellRight: shellRect?.right ?? null,
        shellWidth: shellRect?.width ?? null,
        viewportWidth: window.innerWidth,
      };
    });

    expect(geometry.shellWidth ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(1200.5);
    expect(geometry.shellWidth ?? 0).toBeGreaterThanOrEqual(1199);
    expect(
      Math.abs(
        (geometry.shellLeft ?? 0) - (geometry.viewportWidth - (geometry.shellWidth ?? 0)) / 2,
      ),
    ).toBeLessThanOrEqual(1);
    expect(Math.abs((geometry.headerLeft ?? 0) - (geometry.shellLeft ?? 0))).toBeLessThanOrEqual(1);
    expect(Math.abs((geometry.headerRight ?? 0) - (geometry.shellRight ?? 0))).toBeLessThanOrEqual(
      1,
    );
    expect((geometry.mainLeft ?? 0) >= (geometry.shellLeft ?? 0)).toBe(true);
    expect((geometry.mainRight ?? 0) <= (geometry.shellRight ?? 0) + 1).toBe(true);
    expect(Math.abs((geometry.footerLeft ?? 0) - (geometry.shellLeft ?? 0))).toBeLessThanOrEqual(1);
    expect(Math.abs((geometry.footerRight ?? 0) - (geometry.shellRight ?? 0))).toBeLessThanOrEqual(
      1,
    );
  });
}

test('the marketing shell remains fluid on a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/');

  const geometry = await page.locator('[data-marketing-page-shell]').evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      width: rect.width,
      viewportWidth: window.innerWidth,
    };
  });

  expect(Math.abs(geometry.left)).toBeLessThanOrEqual(1);
  expect(Math.abs(geometry.right - geometry.viewportWidth)).toBeLessThanOrEqual(1);
  expect(Math.abs(geometry.width - geometry.viewportWidth)).toBeLessThanOrEqual(1);
});
