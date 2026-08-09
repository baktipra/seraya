import { expect, test, type Page } from '@playwright/test';

const guestToken = 'browser-fixture';

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

test.describe('Aruna flagship guest experience maturation', () => {
  test('guides the generic reader from the cover into the editorial couple journey', async ({
    page,
  }) => {
    await page.goto('/e2e-aruna');

    const invitation = page.locator('article[data-template="aruna"]');
    const openingAction = invitation.locator('[data-aruna-opening-action]');
    const returnAction = invitation.locator('[data-aruna-return-action]');

    await expect(invitation).toHaveAttribute('data-aruna-experience', 'journal-v1');
    await expect(openingAction).toBeVisible();
    await expect(openingAction).toHaveAttribute('href', '#aruna-couple-title');
    await openingAction.focus();
    await expect(openingAction).toBeFocused();
    await openingAction.click();
    await expect(page).toHaveURL(/#aruna-couple-title$/);

    await expect(invitation.locator('[data-aruna-editors-note]')).toHaveCount(0);
    await expect(invitation.locator('[data-aruna-reader-response]')).toHaveCount(0);
    await expect(invitation.locator('[data-aruna-agenda-entry]')).toHaveCount(2);
    await expect(invitation.locator('[data-aruna-photo-frame]')).toHaveCount(4);
    await expect(returnAction).toHaveAttribute('href', '#aruna-invitation-title');

    await expectNoHorizontalOverflow(page);
  });

  test('composes personal greeting, RSVP, Guestbook, and return as one reading journey', async ({
    page,
  }) => {
    await page.goto(`/e2e-aruna/g/${guestToken}`);

    const invitation = page.locator('article[data-template="aruna"]');
    const openingAction = invitation.locator('[data-aruna-opening-action]');
    const greeting = invitation.locator('[data-aruna-editors-note]');
    const responseJourney = invitation.locator('[data-aruna-reader-response]');
    const responseColumns = responseJourney.locator('[data-aruna-response-column]');
    const returnAction = invitation.locator('[data-aruna-return-action]');

    await expect(openingAction).toHaveAttribute('href', '#aruna-personal-greeting');
    await openingAction.click();
    await expect(page).toHaveURL(/#aruna-personal-greeting$/);

    await expect(greeting).toBeVisible();
    await expect(greeting).toContainText('Tamu Browser');
    await expect(responseJourney).toBeVisible();
    await expect(responseColumns).toHaveCount(2);

    const firstMarker = await responseColumns
      .nth(0)
      .evaluate((element) => getComputedStyle(element, '::before').content.replaceAll('"', ''));
    const secondMarker = await responseColumns
      .nth(1)
      .evaluate((element) => getComputedStyle(element, '::before').content.replaceAll('"', ''));

    expect(firstMarker).toContain('01 / RESPONS');
    expect(secondMarker).toContain('02 / RESPONS');

    await returnAction.focus();
    await expect(returnAction).toBeFocused();
    await returnAction.click();
    await expect(page).toHaveURL(/#aruna-invitation-title$/);

    await expectNoHorizontalOverflow(page);
  });
});
