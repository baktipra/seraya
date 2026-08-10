import { expect, test } from '@playwright/test';

const guestToken = 'browser-fixture';

test.describe('Roselle flagship guest experience', () => {
  test('guides the generic guest from the opening into the couple journey', async ({ page }) => {
    await page.goto('/e2e-roselle');

    const invitation = page.locator('article[data-template="roselle"]');
    const openingAction = invitation.locator('[data-roselle-opening-action]');
    const returnAction = invitation.locator('[data-roselle-return-to-opening]');

    await expect(openingAction).toBeVisible();
    await expect(openingAction).toHaveAttribute('href', '#roselle-couple-title');
    await openingAction.focus();
    await expect(openingAction).toBeFocused();
    await openingAction.click();
    await expect(page).toHaveURL(/#roselle-couple-title$/);

    await expect(invitation.locator('[data-roselle-addressed-letter]')).toHaveCount(0);
    await expect(invitation.locator('[data-roselle-response-step]')).toHaveCount(0);
    await expect(returnAction).toHaveAttribute('href', '#roselle-invitation-title');
  });

  test('composes the personal greeting into the opening ritual before the couple journey', async ({
    page,
  }) => {
    await page.goto(`/e2e-roselle/g/${guestToken}`);

    const invitation = page.locator('article[data-template="roselle"]');
    const openingAction = invitation.locator('[data-roselle-opening-action]');
    const addressedLetter = invitation.locator('[data-roselle-addressed-letter]');
    const responseSteps = invitation.locator('[data-roselle-response-step]');
    const returnAction = invitation.locator('[data-roselle-return-to-opening]');

    await expect(addressedLetter).toBeVisible();
    await expect(addressedLetter).toContainText('Tamu Browser');
    await expect(openingAction).toHaveAttribute('href', '#roselle-couple-title');
    await openingAction.click();
    await expect(page).toHaveURL(/#roselle-couple-title$/);

    await expect(responseSteps).toHaveCount(2);
    await expect(responseSteps.nth(0)).toHaveText('Langkah 1 dari 2');
    await expect(responseSteps.nth(1)).toHaveText('Langkah 2 dari 2');

    await returnAction.click();
    await expect(page).toHaveURL(/#roselle-invitation-title$/);
  });
});
