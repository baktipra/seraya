const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function isElementVisible(element: HTMLElement) {
  const style = window.getComputedStyle(element);
  return (
    element.getAttribute('aria-hidden') !== 'true' &&
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    element.getClientRects().length > 0
  );
}

export function getFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    isElementVisible,
  );
}

export function focusFirstDescendant(container: HTMLElement, fallback: HTMLElement = container) {
  const [first] = getFocusableElements(container);
  (first ?? fallback).focus({ preventScroll: true });
}

export function trapFocusWithin(event: KeyboardEvent, container: HTMLElement) {
  if (event.key !== 'Tab') return;

  const focusable = getFocusableElements(container);
  if (focusable.length === 0) {
    event.preventDefault();
    container.focus({ preventScroll: true });
    return;
  }

  const first = focusable[0]!;
  const last = focusable[focusable.length - 1]!;
  const active = document.activeElement;

  if (event.shiftKey) {
    if (active === first || !container.contains(active)) {
      event.preventDefault();
      last.focus({ preventScroll: true });
    }
    return;
  }

  if (active === last || active === container || !container.contains(active)) {
    event.preventDefault();
    first.focus({ preventScroll: true });
  }
}
