import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const HAVE_CURRENT_DATA = 2;

const assertNoHorizontalOverflow = async (page: Page) => {
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );

  expect(hasHorizontalOverflow).toBe(false);
};

test('renders the compressed seamless campaign hero with a verified playing editorial film', async ({
  page,
}) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Undangan pernikahan yang terasa personal',
    }),
  ).toBeVisible();

  await expect(page.locator('main iframe')).toHaveCount(0);
  await expect(page.locator('[data-homepage-campaign-hero]')).toHaveCount(1);
  await expect(page.locator('[data-editorial-hero-frame]')).toBeVisible();
  await expect(page.locator('[data-editorial-hero-theater]')).toBeVisible();
  await expect(page.locator('[data-editorial-hero-motion]')).toHaveAttribute(
    'data-editorial-hero-motion',
    'true',
  );
  await expect(page.locator('[data-editorial-product-stage]')).toBeVisible();
  await expect(page.locator('[data-editorial-product-card]')).toBeVisible();
  await expect(page.locator('[data-editorial-hero-video]')).toHaveCount(1);
  await expect(page.locator('[data-editorial-personal-card]')).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Jelajahi homepage Seraya' })).toHaveCount(0);

  await expect(
    page.getByRole('img', {
      name: /Film editorial pernikahan Seraya dengan stationery, bunga putih, cincin/,
    }),
  ).toBeVisible();

  const video = page.locator('[data-editorial-hero-video]');
  await expect(video).toHaveAttribute('autoplay', '');
  await expect(video).toHaveAttribute('loop', '');
  await expect(video).toHaveAttribute('muted', '');
  await expect(video).toHaveAttribute('playsinline', '');
  await expect(video).toHaveAttribute(
    'poster',
    '/marketing/hero/seraya-wedding-editorial-poster.avif',
  );

  await page.waitForFunction(
    () => {
      const media = document.querySelector<HTMLVideoElement>('[data-editorial-hero-video]');

      return Boolean(
        media &&
        media.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        media.videoWidth > 0 &&
        media.videoHeight > 0 &&
        !media.paused &&
        media.currentTime > 0.25,
      );
    },
    undefined,
    { timeout: 10_000 },
  );

  const playbackState = await video.evaluate((element) => {
    const media = element as HTMLVideoElement;

    return {
      currentTime: media.currentTime,
      duration: media.duration,
      errorCode: media.error?.code ?? null,
      paused: media.paused,
      readyState: media.readyState,
      videoHeight: media.videoHeight,
      videoWidth: media.videoWidth,
    };
  });

  expect(playbackState.duration).toBeGreaterThanOrEqual(7);
  expect(playbackState.duration).toBeLessThanOrEqual(9);
  expect(playbackState.videoWidth).toBe(1280);
  expect(playbackState.videoHeight).toBe(720);
  expect(playbackState.readyState).toBeGreaterThanOrEqual(HAVE_CURRENT_DATA);
  expect(playbackState.currentTime).toBeGreaterThan(0.25);
  expect(playbackState.paused).toBe(false);
  expect(playbackState.errorCode).toBeNull();

  const primaryAction = page.getByRole('link', { name: 'Jelajahi koleksi' });
  await expect(primaryAction).toBeVisible();
  await expect(primaryAction).toHaveAttribute('href', '/templates');

  const [mp4Response, posterResponse] = await Promise.all([
    page.request.get('/marketing/hero/seraya-wedding-editorial-loop.mp4'),
    page.request.get('/marketing/hero/seraya-wedding-editorial-poster.avif'),
  ]);
  expect(mp4Response.ok()).toBe(true);
  expect(posterResponse.ok()).toBe(true);
  expect(Number(mp4Response.headers()['content-length'] ?? 0)).toBeGreaterThan(1_000_000);

  const geometry = await page.evaluate(() => {
    const shell = document.querySelector<HTMLElement>('[data-marketing-page-shell]');
    const header = document.querySelector('header');
    const hero = document.querySelector<HTMLElement>('[data-homepage-campaign-hero]');
    const frame = document.querySelector<HTMLElement>('[data-editorial-hero-frame]');
    const theater = document.querySelector<HTMLElement>('[data-editorial-hero-theater]');
    const copy = document.querySelector<HTMLElement>('[data-editorial-hero-copy]');
    const collection = document.querySelector<HTMLElement>('#koleksi');

    const shellRect = shell?.getBoundingClientRect();
    const headerRect = header?.getBoundingClientRect();
    const heroRect = hero?.getBoundingClientRect();
    const frameRect = frame?.getBoundingClientRect();
    const theaterRect = theater?.getBoundingClientRect();
    const copyRect = copy?.getBoundingClientRect();
    const collectionRect = collection?.getBoundingClientRect();

    return {
      bodyBackground: window.getComputedStyle(document.body).backgroundColor,
      collectionTop: collectionRect?.top ?? null,
      copyBottom: copyRect?.bottom ?? null,
      copyTop: copyRect?.top ?? null,
      frameBottom: frameRect?.bottom ?? null,
      frameHeight: frameRect?.height ?? null,
      frameLeft: frameRect?.left ?? null,
      frameRight: frameRect?.right ?? null,
      frameTop: frameRect?.top ?? null,
      headerBorderWidth: header ? window.getComputedStyle(header).borderBottomWidth : null,
      shellLeft: shellRect?.left ?? null,
      shellRight: shellRect?.right ?? null,
      shellWidth: shellRect?.width ?? null,
      headerBottom: headerRect?.bottom ?? null,
      heroAnimationName: theater ? window.getComputedStyle(theater).animationName : null,
      heroBackground: hero ? window.getComputedStyle(hero).backgroundColor : null,
      heroBottom: heroRect?.bottom ?? null,
      heroTop: heroRect?.top ?? null,
      theaterBottom: theaterRect?.bottom ?? null,
      theaterLeft: theaterRect?.left ?? null,
      theaterRight: theaterRect?.right ?? null,
      theaterTop: theaterRect?.top ?? null,
      viewportWidth: window.innerWidth,
    };
  });

  expect(geometry.headerBorderWidth).toBe('0px');
  expect(geometry.heroBackground).toBe(geometry.bodyBackground);
  expect(geometry.heroAnimationName).not.toBe('none');
  expect(Math.abs((geometry.heroTop ?? 0) - (geometry.headerBottom ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((geometry.frameTop ?? 0) - (geometry.heroTop ?? 0))).toBeLessThanOrEqual(1);
  expect(geometry.shellWidth ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(1200.5);
  expect(geometry.shellWidth ?? 0).toBeGreaterThan(0);
  expect(
    Math.abs((geometry.shellLeft ?? 0) - (geometry.viewportWidth - (geometry.shellWidth ?? 0)) / 2),
  ).toBeLessThanOrEqual(1);
  expect(Math.abs((geometry.frameLeft ?? 0) - (geometry.shellLeft ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((geometry.frameRight ?? 0) - (geometry.shellRight ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((geometry.theaterLeft ?? 0) - (geometry.frameLeft ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((geometry.theaterRight ?? 0) - (geometry.frameRight ?? 0))).toBeLessThanOrEqual(
    1,
  );
  expect(Math.abs((geometry.theaterTop ?? 0) - (geometry.frameTop ?? 0))).toBeLessThanOrEqual(1);

  if (geometry.viewportWidth > 896) {
    expect(geometry.frameHeight ?? 0).toBeGreaterThanOrEqual(330);
    expect(geometry.frameHeight ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(410);
    expect(
      Math.abs((geometry.theaterBottom ?? 0) - (geometry.frameBottom ?? 0)),
    ).toBeLessThanOrEqual(1);

    const panel = page.locator('[data-editorial-hero-motion]');
    const panelBox = await panel.boundingBox();
    expect(panelBox).not.toBeNull();

    if (panelBox) {
      await page.mouse.move(
        panelBox.x + panelBox.width * 0.28,
        panelBox.y + panelBox.height * 0.28,
      );

      await expect
        .poll(() =>
          panel.evaluate((element) => element.style.getPropertyValue('--card-tilt-y').trim()),
        )
        .not.toBe('0deg');
    }
  } else {
    expect((geometry.theaterBottom ?? 0) < (geometry.frameBottom ?? 0)).toBe(true);
    expect(Math.abs((geometry.copyTop ?? 0) - (geometry.theaterBottom ?? 0))).toBeLessThanOrEqual(
      1,
    );
    expect(Math.abs((geometry.copyBottom ?? 0) - (geometry.frameBottom ?? 0))).toBeLessThanOrEqual(
      1,
    );
  }

  expect(Math.abs((geometry.collectionTop ?? 0) - (geometry.heroBottom ?? 0))).toBeLessThanOrEqual(
    1,
  );
  await assertNoHorizontalOverflow(page);
});

test('keeps the compressed full-width campaign film composed on a narrow mobile viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/');

  await expect(page.locator('[data-homepage-campaign-hero]')).toBeVisible();
  await expect(page.locator('[data-editorial-hero-frame]')).toBeVisible();
  await expect(page.locator('[data-editorial-hero-theater]')).toBeVisible();
  await expect(page.locator('[data-editorial-hero-video]')).toBeVisible();
  await expect(page.locator('[data-editorial-product-stage]')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Jelajahi koleksi' })).toBeVisible();

  const mobileGeometry = await page.evaluate(() => {
    const frame = document.querySelector<HTMLElement>('[data-editorial-hero-frame]');
    const theater = document.querySelector<HTMLElement>('[data-editorial-hero-theater]');
    const frameRect = frame?.getBoundingClientRect();
    const theaterRect = theater?.getBoundingClientRect();

    return {
      frameLeft: frameRect?.left ?? null,
      frameRight: frameRect?.right ?? null,
      theaterLeft: theaterRect?.left ?? null,
      theaterRight: theaterRect?.right ?? null,
      viewportWidth: window.innerWidth,
    };
  });

  expect(Math.abs(mobileGeometry.frameLeft ?? 0)).toBeLessThanOrEqual(1);
  expect(
    Math.abs((mobileGeometry.frameRight ?? 0) - mobileGeometry.viewportWidth),
  ).toBeLessThanOrEqual(1);
  expect(Math.abs(mobileGeometry.theaterLeft ?? 0)).toBeLessThanOrEqual(1);
  expect(
    Math.abs((mobileGeometry.theaterRight ?? 0) - mobileGeometry.viewportWidth),
  ).toBeLessThanOrEqual(1);
  await assertNoHorizontalOverflow(page);
});

test('respects reduced motion for the compressed campaign composition', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  const animationState = await page.evaluate(() => {
    const theater = document.querySelector<HTMLElement>('[data-editorial-hero-theater]');
    const backdrop = document.querySelector<HTMLElement>(
      '[data-editorial-product-stage] > div:first-child',
    );

    return {
      backdropAnimationName: backdrop ? window.getComputedStyle(backdrop).animationName : null,
      theaterAnimationName: theater ? window.getComputedStyle(theater).animationName : null,
    };
  });

  expect(animationState.theaterAnimationName).toBe('none');
  expect(animationState.backdropAnimationName).toBe('none');
});
