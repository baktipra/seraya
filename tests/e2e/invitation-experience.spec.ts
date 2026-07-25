import { expect, type Locator, type Page, test } from '@playwright/test';

const templateKeys = ['roselle', 'aruna', 'laras'] as const;
const guestToken = 'browser-fixture';

type TemplateKey = (typeof templateKeys)[number];

function getGenericPath(templateKey: TemplateKey) {
  return `/e2e-${templateKey}`;
}

function getPersonalPath(templateKey: TemplateKey) {
  return `${getGenericPath(templateKey)}/g/${guestToken}`;
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
  const appearsBefore = await first.evaluate((firstElement, secondElement) => {
    if (!(secondElement instanceof Element)) return false;

    return Boolean(firstElement.compareDocumentPosition(secondElement) & Node.DOCUMENT_POSITION_FOLLOWING);
  }, await second.elementHandle());

  expect(appearsBefore).toBe(true);
}

for (const templateKey of templateKeys) {
  test.describe(`${templateKey} complete invitation experience`, () => {
    test('renders the complete generic journey without guest-private UI or overflow', async ({ page }) => {
      await page.goto(getGenericPath(templateKey));

      const invitation = page.locator(`article[data-template="${templateKey}"]`);
      await expect(invitation).toBeVisible();
      await expect(invitation.getByRole('heading', { name: 'Raka & Nadia' })).toBeVisible();
      await expect(
        invitation.getByRole('heading', { name: 'Cerita yang membawa kami ke sini' }),
      ).toBeVisible();
      await expect(invitation.getByRole('heading', { name: 'Akad Nikah' })).toBeVisible();
      await expect(invitation.getByRole('heading', { name: 'Resepsi' })).toBeVisible();
      await expect(
        invitation.getByRole('heading', { name: 'Tanda kasih untuk perjalanan baru' }),
      ).toBeVisible();
      await expect(invitation.getByText('Raka & Nadia', { exact: true }).last()).toBeVisible();

      const galleryImages = invitation.locator('img');
      await expect(galleryImages).toHaveCount(4);
      for (let index = 0; index < 4; index += 1) {
        await expect(galleryImages.nth(index)).toHaveAttribute('loading', 'lazy');
        const box = await galleryImages.nth(index).boundingBox();
        expect(box?.width ?? 0).toBeGreaterThan(120);
        expect(box?.height ?? 0).toBeGreaterThan(120);
      }

      await expect(invitation.locator('[data-generic-response-note]')).toHaveCount(1);
      await expect(invitation.locator('[data-template-personal-greeting]')).toHaveCount(0);
      await expect(invitation.locator('[data-template-response-journey]')).toHaveCount(0);

      const genericNote = invitation.locator('[data-generic-response-note]');
      const closingSection = invitation.locator('section').last();
      await expectAppearsBefore(genericNote, closingSection);
      await expectNoHorizontalOverflow(page);
    });

    test('composes greeting and response as one personal closing journey', async ({ page }) => {
      await page.goto(getPersonalPath(templateKey));

      const invitation = page.locator(`article[data-template="${templateKey}"]`);
      const greeting = invitation.locator('[data-template-personal-greeting]');
      const responseJourney = invitation.locator('[data-template-response-journey]');
      const digitalGiftHeading = invitation.getByRole('heading', {
        name: 'Tanda kasih untuk perjalanan baru',
      });
      const digitalGiftSection = digitalGiftHeading.locator('xpath=ancestor::section[1]');
      const closingSection = invitation.locator('section').last();

      await expect(greeting).toBeVisible();
      await expect(greeting).toContainText('Tamu Browser');
      await expect(responseJourney).toBeVisible();
      await expect(invitation.locator('[data-generic-response-note]')).toHaveCount(0);
      await expect(invitation.locator('[data-personal-guest-rsvp]')).toBeVisible();
      await expect(invitation.locator('[data-personal-guestbook]')).toBeVisible();

      await expectAppearsBefore(greeting, responseJourney);
      await expectAppearsBefore(digitalGiftSection, responseJourney);
      await expectAppearsBefore(responseJourney, closingSection);

      const responseChoices = invitation.locator('[data-personal-rsvp-choice]');
      await expect(responseChoices).toHaveCount(2);
      for (let index = 0; index < 2; index += 1) {
        const box = await responseChoices.nth(index).boundingBox();
        expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      }

      await expectNoHorizontalOverflow(page);
    });
  });
}
