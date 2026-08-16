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

export function RoselleMotionOrchestrator() {
  const markerRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const root = markerRef.current?.closest<HTMLElement>("article[data-template='roselle']");
    if (!root) {
      return;
    }

    const targets = Array.from(root.querySelectorAll<HTMLElement>(revealSelector));
    const openingGate = root.querySelector<HTMLElement>('[data-roselle-opening-gate]');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion || typeof IntersectionObserver === 'undefined') {
      root.dataset.roselleMotionReady = 'static';
      return () => {
        delete root.dataset.roselleMotionReady;
      };
    }

    let activated = false;
    let observer: IntersectionObserver | null = null;
    let openingObserver: MutationObserver | null = null;

    const activateMotion = () => {
      if (activated) {
        return;
      }

      activated = true;
      openingObserver?.disconnect();
      openingObserver = null;

      for (const target of targets) {
        target.dataset.roselleMotionState = 'idle';
      }
      root.dataset.roselleMotionReady = 'true';

      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const target = entry.target as HTMLElement;

            if (entry.isIntersecting) {
              target.dataset.roselleMotionState = 'visible';
              if (!target.matches(replayableChapterSelector)) {
                observer?.unobserve(target);
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
    };

    if (!openingGate || openingGate.dataset.roselleOpeningState === 'opened') {
      activateMotion();
    } else {
      root.dataset.roselleMotionReady = 'pending';
      openingObserver = new MutationObserver(() => {
        if (openingGate.dataset.roselleOpeningState === 'opened') {
          activateMotion();
        }
      });
      openingObserver.observe(openingGate, {
        attributeFilter: ['data-roselle-opening-state'],
        attributes: true,
      });
    }

    return () => {
      openingObserver?.disconnect();
      observer?.disconnect();
      delete root.dataset.roselleMotionReady;
      for (const target of targets) {
        delete target.dataset.roselleMotionState;
      }
    };
  }, []);

  return <span aria-hidden data-roselle-motion-orchestrator hidden ref={markerRef} />;
}
