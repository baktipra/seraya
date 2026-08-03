'use client';

import Image from 'next/image';
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

  useEffect(() => {
    const panel = panelRef.current;

    if (!panel) {
      return;
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    panel.dataset.motionReady = 'true';

    if (reduceMotion.matches) {
      resetMotion(panel);

      return () => {
        delete panel.dataset.motionReady;
      };
    }

    let animationFrame = 0;

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') {
        return;
      }

      const bounds = panel.getBoundingClientRect();
      const normalizedX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
      const normalizedY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;

      cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        panel.style.setProperty('--hero-shift-x', `${(normalizedX * 9).toFixed(2)}px`);
        panel.style.setProperty('--hero-shift-y', `${(normalizedY * 7).toFixed(2)}px`);
        panel.style.setProperty('--hero-shift-x-reverse', `${(normalizedX * -6).toFixed(2)}px`);
        panel.style.setProperty('--hero-shift-y-reverse', `${(normalizedY * -5).toFixed(2)}px`);
        panel.style.setProperty('--hero-rotate', `${(normalizedX * 0.8).toFixed(2)}deg`);
      });
    };

    const handlePointerLeave = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => resetMotion(panel));
    };

    panel.addEventListener('pointermove', handlePointerMove);
    panel.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      cancelAnimationFrame(animationFrame);
      delete panel.dataset.motionReady;
      panel.removeEventListener('pointermove', handlePointerMove);
      panel.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, []);

  return (
    <section className={styles.hero} data-homepage-campaign-hero data-homepage-editorial-hero>
      <div className={styles.frame}>
        <figure
          aria-label="Visual editorial undangan Roselle untuk Kirana dan Arga dengan kartu undangan bergerak lembut, detail cincin, dan suasana pernikahan Indonesia."
          className={styles.productPanel}
          data-editorial-hero-motion
          data-editorial-hero-theater
          ref={panelRef}
          role="img"
        >
          <div aria-hidden="true" className={styles.productPhoto}>
            <Image
              alt=""
              className={styles.productPhotoImage}
              fill
              priority
              sizes="(min-width: 1024px) 43rem, 100vw"
              src="/showroom/kirana-arga/kirana-arga-environmental-wide.avif"
            />
            <div className={styles.productPhotoWash} />
            <div className={styles.productLightSweep} />
            <div className={styles.productGrain} />
          </div>

          <div aria-hidden="true" className={styles.detailFloat}>
            <div className={styles.detailCard}>
              <Image
                alt=""
                className={styles.detailCardImage}
                fill
                sizes="9rem"
                src="/showroom/kirana-arga/kirana-arga-detail-rings.avif"
              />
              <span className={styles.detailCardLabel}>Wedding detail</span>
            </div>
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

        <div className={styles.copy}>
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
