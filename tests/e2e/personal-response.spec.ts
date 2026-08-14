import { expect, type Locator, type Page, test } from '@playwright/test';

const templateKeys = ['roselle', 'aruna', 'laras'] as const;
const guestToken = 'browser-fixture';
const forcedGuestbookErrorMessage = '__force_error__';

function getGenericPath(templateKey: (typeof templateKeys)[number]) {
  return `/e2e-${templateKey}`;
}

function getPersonalPath(templateKey: (typeof templateKeys)[number]) {
  return `${getGenericPath(templateKey)}/g/${guestToken}`;
}

async function focusFirstRsvpChoiceByTab(page: Page) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator('body').click({ position: { x: 4, y: 4 } });

  for (let attempt = 0; attempt < 40; attempt += 1) {
    await page.keyboard.press('Tab');
    const activeName = await page.evaluate(() => {
      const activeElement = document.activeElement;
      return activeElement instanceof HTMLInputElement ? activeElement.name : null;
    });

    if (activeName === 'status') {
      return;
    }
  }

  throw new Error('RSVP radio group was not reachable with the Tab key.');
}

async function expectVisibleChoiceFocus(choice: Locator) {
  const outline = await choice.evaluate((element) => {
    const computedStyle = window.getComputedStyle(element);
    return {
      style: computedStyle.outlineStyle,
      width: Number.parseFloat(computedStyle.outlineWidth),
    };
  });

  expect(outline.style).not.toBe('none');
  expect(outline.width).toBeGreaterThanOrEqual(2);
}

for (const templateKey of templateKeys) {
  test.describe(`${templateKey} personal response journey`, () => {
    test('keeps generic and personal response boundaries isolated', async ({ page }) => {
      await page.goto(getGenericPath(templateKey));

      await expect(page.locator('[data-generic-response-note]')).toHaveCount(1);
      await expect(page.locator('[data-template-response-journey]')).toHaveCount(0);
      await expect(page.locator('[data-personal-response-form]')).toHaveCount(0);

      await page.goto(getPersonalPath(templateKey));

      await expect(page.locator('[data-generic-response-note]')).toHaveCount(0);
      await expect(page.locator('[data-template-response-journey]')).toHaveCount(1);
      await expect(page.locator('[data-personal-guest-rsvp]')).toBeVisible();
      await expect(page.locator('[data-personal-guestbook]')).toBeVisible();
    });

    test('supports pending to attending keyboard flow and reload persistence', async ({ page }) => {
      await page.goto(getPersonalPath(templateKey));

      const attendingRadio = page.getByRole('radio', { name: 'Hadir', exact: true });
      const attendingChoice = attendingRadio.locator('xpath=..');
      const submitButton = page.getByRole('button', { name: 'Simpan konfirmasi' });

      await expect(attendingRadio).not.toBeChecked();
      await expect(page.getByRole('radio', { name: 'Tidak hadir' })).not.toBeChecked();
      await expect(submitButton).toBeDisabled();
      await expect(submitButton).toHaveCSS('cursor', 'not-allowed');

      const disabledOpacity = Number.parseFloat(
        await submitButton.evaluate((element) => window.getComputedStyle(element).opacity),
      );
      expect(disabledOpacity).toBeLessThan(1);

      await focusFirstRsvpChoiceByTab(page);
      await expect(attendingRadio).toBeFocused();
      await expectVisibleChoiceFocus(attendingChoice);

      await page.keyboard.press('Space');
      await expect(attendingRadio).toBeChecked();
      await expect(submitButton).toBeEnabled();

      const attendeeCount = page.getByLabel('Jumlah orang yang hadir');
      await expect(attendeeCount).toBeVisible();
      await expect(attendeeCount.locator('option')).toHaveCount(4);
      await attendeeCount.selectOption('3');

      await attendeeCount.press('Tab');
      await expect(submitButton).toBeFocused();
      await page.keyboard.press('Enter');

      await expect(page).toHaveURL(/rsvp=success/);
      await expect(page.locator('[data-personal-response-success]')).toContainText(
        'Konfirmasi kehadiran kalian sudah disimpan.',
      );
      await expect(page.locator('[data-personal-response-status]')).toHaveText('Hadir');
      await expect(page.getByLabel('Jumlah orang yang hadir')).toHaveValue('3');

      await page.reload();
      await expect(page.locator('[data-personal-response-status]')).toHaveText('Hadir');
      await expect(page.getByRole('radio', { name: 'Hadir', exact: true })).toBeChecked();
      await expect(page.getByLabel('Jumlah orang yang hadir')).toHaveValue('3');
    });

    test('supports arrow-key decline flow without attendee controls', async ({ page }) => {
      await page.goto(getPersonalPath(templateKey));

      const attendingRadio = page.getByRole('radio', { name: 'Hadir', exact: true });
      const declinedRadio = page.getByRole('radio', { name: 'Tidak hadir' });
      const submitButton = page.getByRole('button', { name: 'Simpan konfirmasi' });

      await focusFirstRsvpChoiceByTab(page);
      await expect(attendingRadio).toBeFocused();
      await page.keyboard.press('ArrowRight');

      await expect(declinedRadio).toBeFocused();
      await expect(declinedRadio).toBeChecked();
      await expect(page.locator('[data-personal-rsvp-attendance]')).toHaveCount(0);
      await expect(submitButton).toBeEnabled();

      await page.keyboard.press('Tab');
      await expect(submitButton).toBeFocused();
      await page.keyboard.press('Enter');

      await expect(page).toHaveURL(/rsvp=success/);
      await expect(page.locator('[data-personal-response-status]')).toHaveText('Tidak hadir');
      await expect(page.locator('[data-personal-rsvp-attendance]')).toHaveCount(0);

      await page.reload();
      await expect(page.getByRole('radio', { name: 'Tidak hadir' })).toBeChecked();
      await expect(page.locator('[data-personal-response-status]')).toHaveText('Tidak hadir');
      await expect(page.locator('[data-personal-rsvp-attendance]')).toHaveCount(0);
    });

    test('covers guestbook sharing consent and reload persistence', async ({ page }) => {
      await page.goto(getPersonalPath(templateKey));

      const consentCheckbox = page.getByRole('checkbox', {
        name: /Izinkan ucapan ini tampil kepada tamu lain/i,
      });
      const sharedWishes = page.locator('[data-personal-shared-wishes]');
      const sharedWishesList = page.locator('[data-personal-shared-wishes-list]');

      await expect(consentCheckbox).not.toBeChecked();
      await expect(sharedWishes).toContainText('Belum ada ucapan yang dibagikan untuk tamu lain.');
      await expect(sharedWishesList).toHaveCount(0);

      const messageField = page.getByLabel('Ucapan & doa');
      await messageField.fill(forcedGuestbookErrorMessage);
      await messageField.press('Tab');

      const submitButton = page.getByRole('button', { name: 'Kirim ucapan' });
      await expect(submitButton).toBeFocused();
      await page.keyboard.press('Enter');

      await expect(page).toHaveURL(/guestbook=error/);
      await expect(page.getByRole('alert')).toContainText('Ucapan belum bisa dikirim.');
      await expect(consentCheckbox).not.toBeChecked();

      const persistedMessage = `Semoga perjalanan kalian selalu hangat — ${templateKey}.`;
      await page.getByLabel('Ucapan & doa').fill(persistedMessage);
      await consentCheckbox.check();
      await page.getByRole('button', { name: 'Kirim ucapan' }).press('Enter');

      await expect(page).toHaveURL(/guestbook=success/);
      await expect(page.locator('[data-personal-response-success]')).toContainText(
        'Ucapan dan preferensi berbagi sudah disimpan.',
      );
      await expect(page.getByLabel('Ucapan & doa')).toHaveValue(persistedMessage);
      await expect(consentCheckbox).toBeChecked();
      await expect(page.getByRole('button', { name: 'Perbarui ucapan' })).toBeVisible();
      await expect(sharedWishesList).toContainText('Tamu Browser');
      await expect(sharedWishesList).toContainText(persistedMessage);

      await page.reload();
      await expect(page.getByLabel('Ucapan & doa')).toHaveValue(persistedMessage);
      await expect(consentCheckbox).toBeChecked();
      await expect(sharedWishesList).toContainText(persistedMessage);

      await consentCheckbox.uncheck();
      await page.getByRole('button', { name: 'Perbarui ucapan' }).press('Enter');

      await expect(page).toHaveURL(/guestbook=success/);
      await expect(page.locator('[data-personal-response-success]')).toContainText(
        'Ucapan dan preferensi berbagi sudah disimpan.',
      );
      await expect(page.getByLabel('Ucapan & doa')).toHaveValue(persistedMessage);
      await expect(consentCheckbox).not.toBeChecked();
      await expect(sharedWishesList).toHaveCount(0);
      await expect(sharedWishes).toContainText('Belum ada ucapan yang dibagikan untuk tamu lain.');

      await page.reload();
      await expect(consentCheckbox).not.toBeChecked();
      await expect(sharedWishesList).toHaveCount(0);
    });
  });
}
