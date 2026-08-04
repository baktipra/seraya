'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';

import styles from './editorial-hero.module.css';

const resetMotion = (element: HTMLElement) => {
  element.style.setProperty('--hero-shift-x', '0px');
  element.style.setProperty('--hero-shift-y', '0px');
  element.style.setProperty('--hero-shift-x-reverse', '0px');
  element.style.setProperty('--hero-shift-y-reverse', '0px');
  element.style.setProperty('--hero-rotate', '0deg');
};

export function EditorialHero() {
  const panelRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const panel = panelRef.current;
    const video = videoRef.current;

    if (!panel || !video) {
      return;
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    panel.dataset.motionReady = 'true';

    const stopReducedMotionPlayback = () => {
      resetMotion(panel);
      video.autoplay = false;
      video.pause();

      if (video.readyState >= HTMLMediaElement.HAVE_METADATA && video.currentTime !== 0) {
        video.currentTime = 0;
      }
    };

    const syncMotionPreference = () => {
      if (reduceMotion.matches) {
        stopReducedMotionPlayback();
        return;
      }

      video.autoplay = true;
      void video.play().catch(() => undefined);
    };

    const handleVideoPlay = () => {
      if (reduceMotion.matches) {
        stopReducedMotionPlayback();
      }
    };

    const handleLoadedMetadata = () => {
      if (reduceMotion.matches) {
        stopReducedMotionPlayback();
      }
    };

    let animationFrame = 0;

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || reduceMotion.matches) {
        return;
      }

      const bounds = panel.getBoundingClientRect();
      const normalizedX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
      const normalizedY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;

      cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        panel.style.setProperty('--hero-shift-x', `${(normalizedX * 4).toFixed(2)}px`);
        panel.style.setProperty('--hero-shift-y', `${(normalizedY * 3).toFixed(2)}px`);
        panel.style.setProperty('--hero-shift-x-reverse', `${(normalizedX * -2).toFixed(2)}px`);
        panel.style.setProperty('--hero-shift-y-reverse', `${(normalizedY * -1.5).toFixed(2)}px`);
        panel.style.setProperty('--hero-rotate', `${(normalizedX * 0.35).toFixed(2)}deg`);
      });
    };

    const handlePointerLeave = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => resetMotion(panel));
    };

    video.addEventListener('play', handleVideoPlay);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    reduceMotion.addEventListener('change', syncMotionPreference);
    panel.addEventListener('pointermove', handlePointerMove);
    panel.addEventListener('pointerleave', handlePointerLeave);
    syncMotionPreference();

    return () => {
      cancelAnimationFrame(animationFrame);
      delete panel.dataset.motionReady;
      video.removeEventListener('play', handleVideoPlay);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      reduceMotion.removeEventListener('change', syncMotionPreference);
      panel.removeEventListener('pointermove', handlePointerMove);
      panel.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, []);

  return (
    <section className={styles.hero} data-homepage-campaign-hero data-homepage-editorial-hero>
      <div className={styles.frame} data-editorial-hero-frame>
        <figure
          aria-label="Film editorial pernikahan Seraya dengan stationery, bunga putih, cincin, dan kartu undangan Roselle untuk Kirana dan Arga yang bergerak lembut."
          className={styles.productPanel}
          data-editorial-hero-motion
          data-editorial-hero-theater
          role="img"
          ref={panelRef}
        >
          <div aria-hidden="true" className={styles.productFilm}>
            <video
              autoPlay
              className={styles.productVideo}
              data-editorial-hero-video
              loop
              muted
              playsInline
              poster="/marketing/hero/seraya-wedding-editorial-poster.avif"
              preload="metadata"
              ref={videoRef}
              tabIndex={-1}
            >
              <source src="/marketing/hero/seraya-wedding-editorial-loop.mp4" type="video/mp4" />
            </video>
            <div className={styles.productPhotoWash} />
            <div className={styles.productLightSweep} />
            <div className={styles.productGrain} />
          </div>

          <div aria-hidden="true" className={styles.sheetFloat}>
            <div className={styles.invitationSheet}>
              <p className={styles.invitationEyebrow}>The wedding of</p>
              <p className={styles.invitationNames}>
                Kirana <span>&amp;</span> Arga
              </p>
              <div className={styles.invitationRule} />
              <p className={styles.invitationDate}>17 Agustus 2027</p>
              <p className={styles.invitationPlace}>Jakarta · Indonesia</p>
            </div>
          </div>

          <div aria-hidden="true" className={styles.productEdgeGlow} />
          <figcaption className={styles.productCaption}>Roselle · personal invitation</figcaption>
        </figure>

        <div className={styles.copy} data-editorial-hero-copy>
          <p className={styles.eyebrow}>Undangan pernikahan digital</p>
          <h1 className={styles.title}>Undangan pernikahan yang terasa personal</h1>
          <p className={styles.lead}>
            Keindahan stationery klasik dengan kemudahan digital. Bagikan undangan secara personal,
            kelola RSVP, dan sambut hari pernikahan dengan lebih tenang.
          </p>
          <Link className={styles.primaryAction} href="/templates">
            Jelajahi koleksi
          </Link>
        </div>
      </div>
    </section>
  );
}
