'use client';

import { useEffect, useRef } from 'react';

const revealSelector = [
  "[data-roselle-chapter]:not([data-roselle-chapter='opening'])",
  '[data-template-response-slot]',
  '[data-template-event-utility-item]',
].join(', ');

export function RoselleMotionOrchestrator() {
  const markerRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const root = markerRef.current?.closest<HTMLElement>("article[data-template='roselle']");
    if (!root) {
      return;
    }

    const targets = Array.from(root.querySelectorAll<HTMLElement>(revealSelector));
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion || typeof IntersectionObserver === 'undefined') {
      root.dataset.roselleMotionReady = 'static';
      return () => {
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
          if (!entry.isIntersecting) {
            continue;
          }

          const target = entry.target as HTMLElement;
          target.dataset.roselleMotionState = 'visible';
          observer.unobserve(target);
        }
      },
      {
        rootMargin: '0px 0px -12% 0px',
        threshold: 0.14,
      },
    );

    for (const target of targets) {
      observer.observe(target);
    }

    return () => {
      observer.disconnect();
      delete root.dataset.roselleMotionReady;
      for (const target of targets) {
        delete target.dataset.roselleMotionState;
      }
    };
  }, []);

  return <span aria-hidden data-roselle-motion-orchestrator hidden ref={markerRef} />;
}
