import { expect, type Locator, type Page, test } from '@playwright/test';

const templateKeys = ['roselle', 'aruna', 'laras'] as const;
const guestToken = 'browser-fixture';
const layoutShiftScoreKey = '__serayaInvitationLayoutShiftScore';
const fixtureGalleryCount = 6;

type TemplateKey = (typeof templateKeys)[number];

function getGenericPath(templateKey: TemplateKey) {
  return `/e2e-${templateKey}`;
}

function getPersonalPath(templateKey: TemplateKey) {
  return `${getGenericPath(templateKey)}/g/${guestToken}`;
}

async function startLayoutShiftObservation(page: Page) {
  await page.addInitScript((scoreKey) => {
    Reflect.set(window, scoreKey, 0);

    if (typeof PerformanceObserver === 'undefined') {
      return;
    }

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const layoutShift = entry as PerformanceEntry & {
            hadRecentInput?: boolean;
            value?: number;
          };

          if (!layoutShift.hadRecentInput && typeof layoutShift.value === 'number') {
            const currentScore = Number(Reflect.get(window, scoreKey)) || 0;
            Reflect.set(window, scoreKey, currentScore + layoutShift.value);
          }
        }
      });

      observer.observe({ buffered: true, type: 'layout-shift' });
    } catch {
      Reflect.set(window, scoreKey, 0);
    }
  }, layoutShiftScoreKey);
}

async function expectLayoutShiftBudget(page: Page) {
  await page.waitForTimeout(120);
  const layoutShiftScore = await page.evaluate(
    (scoreKey) => Number(Reflect.get(window, scoreKey)) || 0,
    layoutShiftScoreKey,
  );

  expect(layoutShiftScore).toBeLessThanOrEqual(0.05);
}

async function expectNoHorizontalOverflow(page: Page) {
  const geometry = await page.evaluate(() => ({
    bodyWidth: document.body.scrollWidth,
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));

  expect(geometry.bodyWidth).toBeLessThanOrEqual(geometry.viewportWidth + 1);
  expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth + 1);
}

async function expectAppearsBefore(first: Locator, second: Locator) {
  const appearsBefore = await first.evaluate(
    (firstElement, secondElement) => {
      if (!(secondElement instanceof Element)) return false;

      return Boolean(
        firstElement.compareDocumentPosition(secondElement) & Node.DOCUMENT_POSITION_FOLLOWING,
      );
    },
    await second.elementHandle(),
  );

  expect(appearsBefore).toBe(true);
}

async function expectMinimumControlHeight(control: Locator, minimum = 44) {
  const box = await control.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(minimum);
}

async function expectFlagshipOpening(page: Page, invitation: Locator, templateKey: TemplateKey) {
  const opening = invitation.locator(':scope > header');
  const title = opening.getByRole('heading', { name: 'Raka & Nadia' });
  const openingAction = invitation.locator(':scope > [data-invitation-opening-action]');

  await expect(opening).toBeVisible();
  await expect(title).toBeVisible();
  await expect(openingAction).toBeVisible();
  await expect(openingAction).toHaveAttribute('href', /^#/);
  await expectMinimumControlHeight(openingAction);

  const viewportHeight = page.viewportSize()?.height ?? 720;
  const openingBox = await opening.boundingBox();
  const titleBox = await title.boundingBox();

  expect(openingBox?.height ?? 0).toBeGreaterThanOrEqual(Math.min(viewportHeight * 0.72, 620) - 1);
  expect(titleBox?.y ?? viewportHeight).toBeLessThan(viewportHeight);

  if (templateKey === 'laras') {
    await expect(opening.locator('[data-opening-monogram]')).toHaveText('RN');
  } else {
    await expect(opening.locator('[data-opening-monogram]')).toHaveCount(0);
  }
}

async function expectStableGalleryMedia(invitation: Locator, templateKey: TemplateKey, page: Page) {
  const gallery = invitation.locator('[data-invitation-gallery]');
  const mediaFrames = gallery.locator('[data-invitation-media-frame]');
  const galleryImages = gallery.locator('[data-invitation-media-image]');

  await expect(gallery).toBeVisible();
  await expect(mediaFrames).toHaveCount(fixtureGalleryCount);
  await expect(galleryImages).toHaveCount(fixtureGalleryCount);

  for (let index = 0; index < fixtureGalleryCount; index += 1) {
    const image = galleryImages.nth(index);

    await expect(image).toHaveAttribute('loading', 'lazy');
    await expect(image).toHaveAttribute('decoding', 'async');
    await expect(image).toHaveAttribute('fetchpriority', 'low');
    await expect(image).toHaveAttribute('width', '900');
    await expect(image).toHaveAttribute('height', '1125');
    await expect(image).toHaveAttribute('sizes', /100vw/);

    const box = await image.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThan(120);
    expect(box?.height ?? 0).toBeGreaterThan(120);
  }

  if (templateKey === 'laras' && (page.viewportSize()?.width ?? 1024) <= 576) {
    const galleryColumns = await gallery
      .locator(':scope > div')
      .evaluate((element) =>
        window.getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean),
      );
    expect(galleryColumns).toHaveLength(1);
  }

  const firstFrame = mediaFrames.first();
  const firstImage = galleryImages.first();
  const frameBeforeFailure = await firstFrame.boundingBox();

  await firstImage.evaluate((element) => {
    element.dispatchEvent(new Event('load', { bubbles: true }));
  });
  await expect(firstFrame).toHaveAttribute('data-media-state', 'ready');

  await firstImage.evaluate((element) => {
    element.dispatchEvent(new Event('error', { bubbles: true }));
  });
  await expect(firstFrame).toHaveAttribute('data-media-state', 'failed');
  await expect(firstFrame.locator('[data-invitation-media-fallback]')).toBeVisible();

  const frameAfterFailure = await firstFrame.boundingBox();
  expect(Math.abs((frameAfterFailure?.width ?? 0) - (frameBeforeFailure?.width ?? 0))).toBeLessThan(
    1,
  );
  expect(
    Math.abs((frameAfterFailure?.height ?? 0) - (frameBeforeFailure?.height ?? 0)),
  ).toBeLessThan(1);
}

for (const templateKey of templateKeys) {
  test.describe(`${templateKey} complete invitation experience`, () => {
    test('renders the complete generic journey without guest-private UI or overflow', async ({
      page,
    }) => {
      await startLayoutShiftObservation(page);
      await page.goto(getGenericPath(templateKey));

      const invitation = page.locator(`article[data-template="${templateKey}"]`);
      const openingAction = invitation.locator(':scope > [data-invitation-opening-action]');
      const coupleSection = invitation.getByRole('heading', {
        name:
          templateKey === 'roselle'
            ? 'Dua cerita, satu perjalanan'
            : templateKey === 'aruna'
              ? 'Dengan sukacita kami mengundang Anda'
              : 'Merayakan awal yang baru',
      });
      const scheduleJourney = invitation.locator('[data-invitation-schedule-journey]');
      const genericNote = invitation.locator('[data-generic-response-note]');
      const closingSection = invitation.locator('section').last();
      const returnAction = invitation.locator(':scope > [data-invitation-return-action]');

      await expect(invitation).toBeVisible();
      await expectFlagshipOpening(page, invitation, templateKey);
      await expect(invitation.getByRole('heading', { name: 'Raka & Nadia' })).toBeVisible();
      await expect(
        invitation.getByRole('heading', { name: 'Cerita yang membawa kami ke sini' }),
      ).toBeVisible();
      await expect(
        invitation.getByRole('heading', { name: 'Akad Nikah dan Doa Keluarga' }),
      ).toBeVisible();
      await expect(
        invitation.getByRole('heading', { name: 'Resepsi dan Jamuan Malam' }),
      ).toBeVisible();
      await expect(scheduleJourney).toBeVisible();
      await expect(scheduleJourney).toContainText('Jakarta Convention Center — Assembly Hall');
      await expect(
        invitation.getByRole('heading', { name: 'Tanda kasih untuk perjalanan baru' }),
      ).toBeVisible();
      await expect(invitation.getByText('Bank Central Asia', { exact: true })).toBeVisible();
      await expect(invitation.getByText('Bank Mandiri', { exact: true })).toBeVisible();
      await expect(invitation.getByText('Raka & Nadia', { exact: true }).last()).toBeVisible();
      await expectStableGalleryMedia(invitation, templateKey, page);

      await expect(genericNote).toHaveCount(1);
      await expect(invitation.locator('[data-template-personal-greeting]')).toHaveCount(0);
      await expect(invitation.locator('[data-template-response-journey]')).toHaveCount(0);
      await expect(returnAction).toBeVisible();
      await expectMinimumControlHeight(returnAction);

      await expectAppearsBefore(openingAction, coupleSection);
      await expectAppearsBefore(genericNote, closingSection);
      await expectAppearsBefore(closingSection, returnAction);
      await expectNoHorizontalOverflow(page);
      await expectLayoutShiftBudget(page);
    });

    test('composes greeting and response as one personal closing journey', async ({ page }) => {
      await startLayoutShiftObservation(page);
      await page.goto(getPersonalPath(templateKey));

      const invitation = page.locator(`article[data-template="${templateKey}"]`);
      const openingAction = invitation.locator(':scope > [data-invitation-opening-action]');
      const greeting = invitation.locator(':scope > [data-template-personal-greeting]');
      const responseJourney = invitation.locator('[data-template-response-journey]');
      const scheduleJourney = invitation.locator('[data-invitation-schedule-journey]');
      const digitalGiftHeading = invitation.getByRole('heading', {
        name: 'Tanda kasih untuk perjalanan baru',
      });
      const digitalGiftSection = digitalGiftHeading.locator('xpath=ancestor::section[1]');
      const closingSection = invitation.locator('section').last();
      const returnAction = invitation.locator(':scope > [data-invitation-return-action]');

      await expectFlagshipOpening(page, invitation, templateKey);
      await expect(openingAction).toHaveAttribute('href', /personal-greeting/);
      await expect(greeting).toBeVisible();
      await expect(greeting).toContainText('Tamu Browser');
      await expect(responseJourney).toBeVisible();
      await expect(scheduleJourney).toBeVisible();
      await expect(invitation.locator('[data-generic-response-note]')).toHaveCount(0);
      await expect(invitation.locator('[data-personal-guest-rsvp]')).toBeVisible();
      await expect(invitation.locator('[data-personal-guestbook]')).toBeVisible();
      await expectStableGalleryMedia(invitation, templateKey, page);

      await expectAppearsBefore(openingAction, greeting);
      await expectAppearsBefore(greeting, scheduleJourney);
      await expectAppearsBefore(greeting, responseJourney);
      await expectAppearsBefore(digitalGiftSection, responseJourney);
      await expectAppearsBefore(responseJourney, closingSection);
      await expectAppearsBefore(closingSection, returnAction);

      const responseChoices = invitation.locator('[data-personal-rsvp-choice]');
      await expect(responseChoices).toHaveCount(2);
      for (let index = 0; index < 2; index += 1) {
        await expectMinimumControlHeight(responseChoices.nth(index), 44);
      }

      await expectMinimumControlHeight(returnAction);
      await expectNoHorizontalOverflow(page);
      await expectLayoutShiftBudget(page);
    });
  });
}
