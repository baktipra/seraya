'use client';

import { useEffect, useRef } from 'react';

const revealSelector = [
  "[data-roselle-chapter]:not([data-roselle-chapter='opening']):not([data-roselle-chapter='greeting'])",
  '[data-template-event-utility-item]',
].join(', ');

const replayableChapterSelector = [
  "[data-roselle-chapter='couple']",
  "[data-roselle-chapter='story']",
  "[data-roselle-chapter='events']",
  "[data-roselle-chapter='location']",
  "[data-roselle-chapter='film']",
  "[data-roselle-chapter='gallery']",
  "[data-roselle-chapter='gift']",
  "[data-roselle-chapter='closing']",
].join(', ');

const openingTransitionMs = 1560;

export function RoselleMotionOrchestrator() {
  const markerRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const root = markerRef.current?.closest<HTMLElement>("article[data-template='roselle']");
    if (!root) {
      return;
    }

    const targets = Array.from(root.querySelectorAll<HTMLElement>(revealSelector));
    const openingAction = root.querySelector<HTMLAnchorElement>('[data-roselle-opening-action]');
    const openingGate = root.querySelector<HTMLElement>('[data-roselle-opening-gate]');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let openingTimer: number | null = null;
    let restoreScroll: (() => void) | null = null;

    const unlockScroll = () => {
      restoreScroll?.();
      restoreScroll = null;
    };

    const lockScroll = () => {
      const html = document.documentElement;
      const body = document.body;
      const previousHtmlOverflow = html.style.overflow;
      const previousBodyOverflow = body.style.overflow;

      html.style.overflow = 'hidden';
      body.style.overflow = 'hidden';

      restoreScroll = () => {
        html.style.overflow = previousHtmlOverflow;
        body.style.overflow = previousBodyOverflow;
      };
    };

    const finishOpening = () => {
      if (openingTimer !== null) {
        window.clearTimeout(openingTimer);
        openingTimer = null;
      }

      root.dataset.roselleOpeningState = 'opened';
      openingGate?.setAttribute('aria-hidden', 'true');
      unlockScroll();
      window.scrollTo({ left: 0, top: 0, behavior: 'auto' });
    };

    const handleOpeningAction = (event: MouseEvent) => {
      if (root.dataset.roselleOpeningState === 'opened') {
        return;
      }

      event.preventDefault();

      if (reducedMotion) {
        finishOpening();
        return;
      }

      if (root.dataset.roselleOpeningState === 'opening') {
        return;
      }

      root.dataset.roselleOpeningState = 'opening';
      openingTimer = window.setTimeout(finishOpening, openingTransitionMs);
    };

    const shouldRunOpeningCeremony = Boolean(openingAction && openingGate && !window.location.hash);

    if (shouldRunOpeningCeremony) {
      root.dataset.roselleOpeningState = 'closed';
      openingGate?.removeAttribute('aria-hidden');
      if (!reducedMotion) {
        lockScroll();
      }
      openingAction?.addEventListener('click', handleOpeningAction);
    } else {
      root.dataset.roselleOpeningState = 'opened';
    }

    if (reducedMotion || typeof IntersectionObserver === 'undefined') {
      root.dataset.roselleMotionReady = 'static';
      return () => {
        if (openingTimer !== null) {
          window.clearTimeout(openingTimer);
        }
        openingAction?.removeEventListener('click', handleOpeningAction);
        unlockScroll();
        openingGate?.removeAttribute('aria-hidden');
        delete root.dataset.roselleOpeningState;
        delete root.dataset.roselleMotionReady;
      };
    }

    for (const target of targets) {
      target.dataset.roselleMotionState = 'idle';
    }
    root.dataset.roselleMotionReady = 'true';

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const target = entry.target as HTMLElement;

          if (entry.isIntersecting) {
            target.dataset.roselleMotionState = 'visible';
            if (!target.matches(replayableChapterSelector)) {
              observer.unobserve(target);
            }
            continue;
          }

          if (target.matches(replayableChapterSelector)) {
            target.dataset.roselleMotionState = 'idle';
          }
        }
      },
      {
        rootMargin: '-6% 0px -12% 0px',
        threshold: 0.08,
      },
    );

    for (const target of targets) {
      observer.observe(target);
    }

    return () => {
      observer.disconnect();
      if (openingTimer !== null) {
        window.clearTimeout(openingTimer);
      }
      openingAction?.removeEventListener('click', handleOpeningAction);
      unlockScroll();
      openingGate?.removeAttribute('aria-hidden');
      delete root.dataset.roselleOpeningState;
      delete root.dataset.roselleMotionReady;
      for (const target of targets) {
        delete target.dataset.roselleMotionState;
      }
    };
  }, []);

  return <span aria-hidden data-roselle-motion-orchestrator hidden ref={markerRef} />;
}
