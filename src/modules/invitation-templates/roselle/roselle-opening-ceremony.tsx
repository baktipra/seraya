'use client';

import type { MouseEvent, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

import marketFloorStyles from './roselle-market-floor-v1.module.css';
import stageStyles from './roselle-opening-stage-v4b.module.css';

type RoselleOpeningState = 'fallback' | 'closed' | 'opening' | 'opened';

type RoselleOpeningCeremonyProps = {
  children: ReactNode;
};

const openingTransitionMs = 1560;

export function RoselleOpeningCeremony({ children }: RoselleOpeningCeremonyProps) {
  const [state, setState] = useState<RoselleOpeningState>('fallback');
  const openingTimerRef = useRef<number | null>(null);
  const restoreScrollRef = useRef<(() => void) | null>(null);
  const reducedMotionRef = useRef(false);

  const unlockScroll = () => {
    restoreScrollRef.current?.();
    restoreScrollRef.current = null;
  };

  const finishOpening = () => {
    if (openingTimerRef.current !== null) {
      window.clearTimeout(openingTimerRef.current);
      openingTimerRef.current = null;
    }

    setState('opened');
    unlockScroll();
    window.scrollTo({ left: 0, top: 0, behavior: 'auto' });
  };

  useEffect(() => {
    if (window.location.hash) {
      setState('opened');
      return;
    }

    reducedMotionRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setState('closed');

    if (!reducedMotionRef.current) {
      const html = document.documentElement;
      const body = document.body;
      const previousHtmlOverflow = html.style.overflow;
      const previousBodyOverflow = body.style.overflow;

      html.style.overflow = 'hidden';
      body.style.overflow = 'hidden';

      restoreScrollRef.current = () => {
        html.style.overflow = previousHtmlOverflow;
        body.style.overflow = previousBodyOverflow;
      };
    }

    return () => {
      if (openingTimerRef.current !== null) {
        window.clearTimeout(openingTimerRef.current);
      }
      unlockScroll();
    };
  }, []);

  const handleOpen = (event: MouseEvent<HTMLAnchorElement>) => {
    if (state === 'fallback' || state === 'opened') {
      return;
    }

    event.preventDefault();

    if (reducedMotionRef.current) {
      finishOpening();
      return;
    }

    if (state === 'opening') {
      return;
    }

    setState('opening');
    openingTimerRef.current = window.setTimeout(finishOpening, openingTransitionMs);
  };

  return (
    <div
      className={`${marketFloorStyles.openingGate} ${stageStyles.stage}`}
      data-roselle-opening-gate="market-floor-v1"
      data-roselle-opening-stage="v4b"
      data-roselle-opening-state={state}
    >
      {children}
      <a
        className={stageStyles.openAction}
        data-invitation-opening-action
        data-roselle-opening-action
        href="#roselle-couple-title"
        onClick={handleOpen}
      >
        <span>Buka undangan</span>
        <i aria-hidden="true" />
      </a>
    </div>
  );
}
