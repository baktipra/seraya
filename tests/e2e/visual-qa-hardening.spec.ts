import { expect, type Locator, type Page, test } from '@playwright/test';

const guestToken = 'browser-fixture';
const layoutShiftScoreKey = '__serayaVisualQaLayoutShiftScore';

const templates = {
  aruna: {
    coupleAnchor: '#aruna-couple-title',
    greetingAnchor: '#aruna-personal-greeting',
    identity: 'modern-wedding-journal',
  },
  laras: {
    coupleAnchor: '#laras-couple-title',
    greetingAnchor: '#laras-personal-greeting',
    identity: 'formal-evening-ceremony-folio',
  },
  roselle: {
    coupleAnchor: '#roselle-couple-title',
    greetingAnchor: '#roselle-personal-greeting',
    identity: 'intimate-romantic-letter',
  },
} as const;

const surfaces = ['generic', 'personal'] as const;

type TemplateKey = keyof typeof templates;
type Surface = (typeof surfaces)[number];

function getSurfacePath(templateKey: TemplateKey, surface: Surface) {
  const genericPath = `/e2e-${templateKey}`;
  return surface === 'personal' ? `${genericPath}/g/${guestToken}` : genericPath;
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

async function expectStableMedia(invitation: Locator) {
  const frames = invitation.locator('[data-invitation-media-frame]');
  const images = invitation.locator('[data-invitation-media-image]');
  const imageCount = await images.count();

  expect(imageCount).toBeGreaterThan(0);
  await expect(frames).toHaveCount(imageCount);

  await images.evaluateAll((elements) => {
    for (const element of elements) {
      element.dispatchEvent(new Event('load', { bubbles: true }));
    }
  });

  for (let index = 0; index < imageCount; index += 1) {
    const image = images.nth(index);
    const frame = frames.nth(index);

    await expect(image).toHaveAttribute('width', '900');
    await expect(image).toHaveAttribute('height', '1125');
    await expect(image).toHaveAttribute('loading', 'lazy');
    await expect(image).toHaveAttribute('decoding', 'async');
    await expect(frame).toHaveAttribute('data-media-state', 'ready');

    const box = await frame.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThan(120);
    expect(box?.height ?? 0).toBeGreaterThan(120);
  }

  const firstFrame = frames.first();
  const firstImage = images.first();
  const beforeFailure = await firstFrame.boundingBox();

  await firstImage.evaluate((element) => {
    element.dispatchEvent(new Event('error', { bubbles: true }));
  });

  await expect(firstFrame).toHaveAttribute('data-media-state', 'failed');
  await expect(firstFrame.locator('[data-invitation-media-fallback]')).toBeVisible();

  const afterFailure = await firstFrame.boundingBox();
  expect(Math.abs((afterFailure?.width ?? 0) - (beforeFailure?.width ?? 0))).toBeLessThan(1);
  expect(Math.abs((afterFailure?.height ?? 0) - (beforeFailure?.height ?? 0))).toBeLessThan(1);

  await firstImage.evaluate((element) => {
    element.dispatchEvent(new Event('load', { bubbles: true }));
  });
  await expect(firstFrame).toHaveAttribute('data-media-state', 'ready');

  return imageCount;
}

async function auditKeyboardJourney(page: Page, invitation: Locator) {
  await page.evaluate(() => {
    document.body.tabIndex = -1;
    document.body.focus();
  });

  const visited = new Set<string>();
  const failures: string[] = [];
  let sawOpeningAction = false;
  let sawReturnAction = false;

  for (let index = 0; index < 80; index += 1) {
    await page.keyboard.press('Tab');

    const activeState = await page.evaluate(() => {
      const activeElement = document.activeElement;
      if (!(activeElement instanceof HTMLElement)) {
        return null;
      }

      const template = activeElement.closest('[data-template]');
      if (!template) {
        return null;
      }

      const style = window.getComputedStyle(activeElement);
      const box = activeElement.getBoundingClientRect();
      const signature = [
        activeElement.tagName.toLowerCase(),
        activeElement.id,
        activeElement.getAttribute('name') ?? '',
        activeElement.getAttribute('href') ?? '',
        activeElement.getAttribute('data-template-response-slot') ?? '',
        activeElement.textContent?.trim().slice(0, 40) ?? '',
      ].join('|');

      return {
        focusVisible: activeElement.matches(':focus-visible'),
        hasVisibleIndicator:
          (style.outlineStyle !== 'none' && Number.parseFloat(style.outlineWidth) > 0) ||
          style.boxShadow !== 'none',
        height: box.height,
        isOpeningAction: activeElement.hasAttribute('data-invitation-opening-action'),
        isReturnAction: activeElement.hasAttribute('data-invitation-return-action'),
        signature,
        tagName: activeElement.tagName.toLowerCase(),
      };
    });

    if (!activeState) {
      continue;
    }

    if (visited.has(activeState.signature)) {
      if (sawOpeningAction && sawReturnAction) {
        break;
      }
      continue;
    }

    visited.add(activeState.signature);
    sawOpeningAction ||= activeState.isOpeningAction;
    sawReturnAction ||= activeState.isReturnAction;

    if (!activeState.focusVisible || !activeState.hasVisibleIndicator) {
      failures.push(`${activeState.signature}: missing visible keyboard focus`);
    }

    if (
      ['a', 'button', 'select', 'textarea'].includes(activeState.tagName) &&
      activeState.height < 40
    ) {
      failures.push(`${activeState.signature}: ${activeState.height.toFixed(1)}px control height`);
    }
  }

  expect(failures).toEqual([]);
  expect(sawOpeningAction).toBe(true);
  expect(sawReturnAction).toBe(true);
  expect(visited.size).toBeGreaterThanOrEqual(4);

  await expect(invitation.locator(':scope > [data-invitation-opening-action]')).toBeVisible();
  await expect(invitation.locator(':scope > [data-invitation-return-action]')).toBeVisible();

  return visited.size;
}

async function auditSemanticContract(invitation: Locator) {
  return invitation.evaluate((root) => {
    const getControlName = (control: Element) => {
      const ariaLabel = control.getAttribute('aria-label')?.trim();
      if (ariaLabel) return ariaLabel;

      const labelledBy = control.getAttribute('aria-labelledby');
      if (labelledBy) {
        const text = labelledBy
          .split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
          .join(' ')
          .trim();
        if (text) return text;
      }

      if (
        (control instanceof HTMLInputElement ||
          control instanceof HTMLSelectElement ||
          control instanceof HTMLTextAreaElement) &&
        control.labels?.length
      ) {
        const text = Array.from(control.labels)
          .map((label) => label.textContent?.trim() ?? '')
          .join(' ')
          .trim();
        if (text) return text;
      }

      if (
        (control instanceof HTMLButtonElement || control instanceof HTMLAnchorElement) &&
        control.textContent?.trim()
      ) {
        return control.textContent.trim();
      }

      return control.getAttribute('title')?.trim() ?? '';
    };

    const brokenLabelReferences = Array.from(root.querySelectorAll('[aria-labelledby]'))
      .filter((element) =>
        (element.getAttribute('aria-labelledby') ?? '')
          .split(/\s+/)
          .some((id) => !id || !document.getElementById(id)),
      )
      .map((element) => element.outerHTML.slice(0, 180));

    const brokenLocalAnchors = Array.from(root.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'))
      .filter((anchor) => {
        const targetId = anchor.hash.slice(1);
        return !targetId || !document.getElementById(targetId);
      })
      .map((anchor) => anchor.getAttribute('href') ?? '');

    const missingImageAlternatives = Array.from(root.querySelectorAll('img'))
      .filter((image) => !image.hasAttribute('alt'))
      .map((image) => image.getAttribute('src')?.slice(0, 80) ?? 'unknown image');

    const unnamedControls = Array.from(
      root.querySelectorAll('button, input:not([type="hidden"]), select, textarea'),
    )
      .filter((control) => !getControlName(control))
      .map((control) => control.outerHTML.slice(0, 180));

    return {
      brokenLabelReferences,
      brokenLocalAnchors,
      missingImageAlternatives,
      unnamedControls,
    };
  });
}

async function auditReducedMotion(invitation: Locator) {
  return invitation.evaluate((root) => {
    const parseTime = (value: string) =>
      value
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) =>
          part.endsWith('ms')
            ? Number.parseFloat(part) / 1000
            : part.endsWith('s')
              ? Number.parseFloat(part)
              : 0,
        )
        .reduce((maximum, value) => Math.max(maximum, Number.isFinite(value) ? value : 0), 0);

    const offenders: string[] = [];
    const elements = [root, ...Array.from(root.querySelectorAll('*'))];

    if (window.getComputedStyle(root).scrollBehavior !== 'auto') {
      offenders.push(`article: scroll-behavior=${window.getComputedStyle(root).scrollBehavior}`);
    }

    for (const element of elements) {
      for (const pseudoElement of [null, '::before', '::after'] as const) {
        const style = window.getComputedStyle(element, pseudoElement);
        const animationDuration = parseTime(style.animationDuration);
        const transitionDuration = parseTime(style.transitionDuration);

        if (animationDuration > 0.001 || transitionDuration > 0.001) {
          offenders.push(
            `${element.tagName.toLowerCase()}${pseudoElement ?? ''}: animation=${style.animationDuration}, transition=${style.transitionDuration}`,
          );
        }

        if (offenders.length >= 20) {
          return offenders;
        }
      }
    }

    return offenders;
  });
}

async function collectLayoutMetrics(page: Page) {
  await page.waitForTimeout(150);

  return page.evaluate((scoreKey) => {
    const navigation = performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming
      | undefined;

    return {
      bodyWidth: document.body.scrollWidth,
      cls: Number(Reflect.get(window, scoreKey)) || 0,
      documentWidth: document.documentElement.scrollWidth,
      domContentLoaded: navigation?.domContentLoadedEventEnd ?? 0,
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
    };
  }, layoutShiftScoreKey);
}

for (const templateKey of Object.keys(templates) as TemplateKey[]) {
  for (const surface of surfaces) {
    test(`${templateKey} ${surface} visual, responsive, accessibility, and stability contract`, async ({
      page,
    }, testInfo) => {
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];
      const descriptor = templates[templateKey];

      page.on('console', (message) => {
        if (message.type() === 'error') {
          consoleErrors.push(message.text());
        }
      });
      page.on('pageerror', (error) => pageErrors.push(error.message));

      await page.emulateMedia({ reducedMotion: 'reduce' });
      await startLayoutShiftObservation(page);
      await page.goto(getSurfacePath(templateKey, surface));

      const boundary = page.locator(
        `[data-invitation-parity="v1"][data-parity-template="${templateKey}"]`,
      );
      const invitation = boundary.locator(`article[data-template="${templateKey}"]`);
      const openingAction = invitation.locator(':scope > [data-invitation-opening-action]');
      const returnAction = invitation.locator(':scope > [data-invitation-return-action]');
      const expectedOpeningTarget =
        surface === 'personal' ? descriptor.greetingAnchor : descriptor.coupleAnchor;

      await expect(boundary).toHaveAttribute('data-parity-identity', descriptor.identity);
      await expect(boundary).toHaveAttribute('data-surface', surface);
      await expect(invitation).toBeVisible();
      await expect(invitation.locator('h1')).toHaveCount(1);
      await expect(invitation.locator('h1')).toBeVisible();
      await expect(openingAction).toHaveAttribute('href', expectedOpeningTarget);
      await expect(invitation.locator(expectedOpeningTarget)).toBeVisible();
      await expect(returnAction).toHaveAttribute('href', /^#/);

      const returnTarget = await returnAction.getAttribute('href');
      if (!returnTarget) {
        throw new Error(`${templateKey} ${surface} return action has no target`);
      }
      await expect(invitation.locator(returnTarget)).toBeVisible();

      if (surface === 'generic') {
        await expect(invitation.locator('[data-template-personal-greeting]')).toHaveCount(0);
        await expect(invitation.locator('[data-template-response-journey]')).toHaveCount(0);
        await expect(invitation.locator('[data-generic-response-note]')).toHaveCount(1);
      } else {
        await expect(invitation.locator('[data-template-personal-greeting]')).toBeVisible();
        await expect(invitation.locator('[data-template-response-journey]')).toBeVisible();
        await expect(invitation.locator('[data-personal-guest-rsvp]')).toBeVisible();
        await expect(invitation.locator('[data-personal-guestbook]')).toBeVisible();
        await expect(invitation.locator('[data-generic-response-note]')).toHaveCount(0);
      }

      const imageCount = await expectStableMedia(invitation);
      const keyboardTargetCount = await auditKeyboardJourney(page, invitation);
      const semanticAudit = await auditSemanticContract(invitation);
      const motionOffenders = await auditReducedMotion(invitation);

      expect(semanticAudit.brokenLabelReferences).toEqual([]);
      expect(semanticAudit.brokenLocalAnchors).toEqual([]);
      expect(semanticAudit.missingImageAlternatives).toEqual([]);
      expect(semanticAudit.unnamedControls).toEqual([]);
      expect(motionOffenders).toEqual([]);

      const evidence = await page.screenshot({ fullPage: true, quality: 72, type: 'jpeg' });
      const layoutMetrics = await collectLayoutMetrics(page);

      expect(layoutMetrics.bodyWidth).toBeLessThanOrEqual(layoutMetrics.viewportWidth + 1);
      expect(layoutMetrics.documentWidth).toBeLessThanOrEqual(layoutMetrics.viewportWidth + 1);
      expect(layoutMetrics.cls).toBeLessThanOrEqual(0.05);
      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);

      await testInfo.attach(`${templateKey}-${surface}-${testInfo.project.name}`, {
        body: evidence,
        contentType: 'image/jpeg',
      });
      await testInfo.attach('visual-qa-metrics', {
        body: Buffer.from(
          JSON.stringify(
            {
              consoleErrors,
              imageCount,
              keyboardTargetCount,
              layoutMetrics,
              pageErrors,
              project: testInfo.project.name,
              surface,
              templateKey,
            },
            null,
            2,
          ),
        ),
        contentType: 'application/json',
      });
    });
  }
}
