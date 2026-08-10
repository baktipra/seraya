'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { InvitationTemplateKey } from '@/modules/invitation-templates/invitation-template.keys';
import type { InvitationRenderSurfaceV1 } from '@/modules/invitation-templates/core/theme-renderer.types';
import type { InvitationAudioPlaybackCapability } from '@/modules/media/invitation-audio-playback.types';

import styles from './invitation-audio-playback-control.module.css';

type PlaybackState = 'error' | 'idle' | 'loading' | 'muted' | 'playing';

type InvitationAudioPlaybackControlProps = {
  capability: InvitationAudioPlaybackCapability;
  surface: InvitationRenderSurfaceV1;
  templateKey: InvitationTemplateKey;
};

function createPlaybackRequestUrl(requestUrl: string) {
  const separator = requestUrl.includes('?') ? '&' : '?';
  return `${requestUrl}${separator}playback=${Date.now()}`;
}

function getPlaybackCopy(state: PlaybackState) {
  switch (state) {
    case 'loading':
      return {
        ariaLabel: 'Menyiapkan musik undangan',
        liveMessage: 'Musik undangan sedang disiapkan.',
        visibleLabel: 'Menyiapkan…',
      };
    case 'playing':
      return {
        ariaLabel: 'Matikan suara musik undangan',
        liveMessage: 'Musik undangan sedang diputar dengan suara aktif.',
        visibleLabel: 'Suara aktif',
      };
    case 'muted':
      return {
        ariaLabel: 'Nyalakan suara musik undangan',
        liveMessage: 'Musik undangan tetap diputar tanpa suara.',
        visibleLabel: 'Suara mati',
      };
    case 'error':
      return {
        ariaLabel: 'Coba putar kembali musik undangan',
        liveMessage: 'Musik belum dapat diputar. Tombol dapat digunakan untuk mencoba lagi.',
        visibleLabel: 'Coba lagi',
      };
    default:
      return {
        ariaLabel: 'Putar musik undangan',
        liveMessage: 'Musik undangan tersedia dan siap diputar ketika undangan dibuka.',
        visibleLabel: 'Putar musik',
      };
  }
}

export function InvitationAudioPlaybackControl({
  capability,
  surface,
  templateKey,
}: InvitationAudioPlaybackControlProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<PlaybackState>('idle');
  const stateRef = useRef<PlaybackState>('idle');
  const copy = getPlaybackCopy(state);
  const isLoaded = state === 'playing' || state === 'muted';

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const audio = audioRef.current;

    return () => {
      if (!audio) return;
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    };
  }, []);

  const startPlayback = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || stateRef.current === 'loading') {
      return;
    }

    audio.pause();
    audio.muted = false;
    audio.src = createPlaybackRequestUrl(capability.requestUrl);
    audio.load();
    stateRef.current = 'loading';
    setState('loading');

    try {
      await audio.play();
      stateRef.current = 'playing';
      setState('playing');
    } catch {
      audio.removeAttribute('src');
      audio.load();
      stateRef.current = 'error';
      setState('error');
    }
  }, [capability.requestUrl]);

  useEffect(() => {
    if (templateKey !== 'roselle') {
      return;
    }

    function handleRoselleOpening(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element) || !target.closest('[data-roselle-opening-action]')) {
        return;
      }

      if (stateRef.current === 'idle' || stateRef.current === 'error') {
        void startPlayback();
        return;
      }

      if (stateRef.current === 'muted' && audioRef.current) {
        audioRef.current.muted = false;
        stateRef.current = 'playing';
        setState('playing');
      }
    }

    document.addEventListener('click', handleRoselleOpening);
    return () => document.removeEventListener('click', handleRoselleOpening);
  }, [startPlayback, templateKey]);

  async function handlePlaybackClick() {
    const audio = audioRef.current;
    if (!audio || state === 'loading') {
      return;
    }

    if (state === 'playing') {
      audio.muted = true;
      stateRef.current = 'muted';
      setState('muted');
      return;
    }

    if (state === 'muted') {
      audio.muted = false;
      stateRef.current = 'playing';
      setState('playing');
      return;
    }

    await startPlayback();
  }

  return (
    <div
      className={[
        styles.root,
        surface === 'preview' ? styles.preview : styles.guest,
        styles[templateKey],
        state === 'error' ? styles.error : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-audio-opening-sync={templateKey === 'roselle' ? 'roselle-market-floor-v1' : undefined}
      data-audio-playback-state={state}
      data-invitation-audio-playback="v4j-slice-c"
      data-playback-surface={surface}
    >
      <audio
        ref={audioRef}
        loop
        onError={() => {
          stateRef.current = 'error';
          setState('error');
        }}
        onPlaying={() => {
          const nextState = stateRef.current === 'muted' ? 'muted' : 'playing';
          stateRef.current = nextState;
          setState(nextState);
        }}
        playsInline
        preload="none"
      />
      <button
        aria-label={copy.ariaLabel}
        aria-pressed={isLoaded ? state === 'muted' : undefined}
        className={styles.button}
        disabled={state === 'loading'}
        onClick={handlePlaybackClick}
        type="button"
      >
        <span aria-hidden="true" className={styles.icon}>
          {state === 'muted' ? '×' : state === 'error' ? '↻' : '♪'}
        </span>
        <span>{copy.visibleLabel}</span>
      </button>
      <span aria-live="polite" className="sr-only" role="status">
        {copy.liveMessage}
      </span>
    </div>
  );
}
