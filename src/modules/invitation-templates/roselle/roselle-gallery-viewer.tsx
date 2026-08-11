'use client';

import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';

import { InvitationGalleryImage } from '../invitation-gallery-image';
import type { InvitationViewModel } from '../invitation-view-model';

import viewerStyles from './roselle-gallery-viewer.module.css';
import styles from './roselle.module.css';

type RoselleGalleryImage = NonNullable<InvitationViewModel['gallery']>['images'][number];

type RoselleGalleryViewerProps = {
  images: readonly RoselleGalleryImage[];
  layout: 'diptych' | 'mosaic' | 'single' | 'triptych';
};

function getWrappedIndex(index: number, length: number) {
  return ((index % length) + length) % length;
}

export function RoselleGalleryViewer({ images, layout }: RoselleGalleryViewerProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const isOpen = activeIndex !== null;
  const activeImage = activeIndex === null ? null : images[activeIndex] ?? null;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => closeButtonRef.current?.focus(), 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setActiveIndex(null);
        return;
      }

      if (images.length <= 1) {
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setActiveIndex((current) =>
          current === null ? null : getWrappedIndex(current - 1, images.length),
        );
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        setActiveIndex((current) =>
          current === null ? null : getWrappedIndex(current + 1, images.length),
        );
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreFocusRef.current?.focus();
    };
  }, [images.length, isOpen]);

  const move = (offset: number) => {
    if (images.length <= 1) {
      return;
    }

    setActiveIndex((current) =>
      current === null ? null : getWrappedIndex(current + offset, images.length),
    );
  };

  const handleTouchEnd = (clientX: number) => {
    const startX = touchStartXRef.current;
    touchStartXRef.current = null;

    if (startX === null || images.length <= 1) {
      return;
    }

    const distance = clientX - startX;
    if (Math.abs(distance) < 48) {
      return;
    }

    move(distance > 0 ? -1 : 1);
  };

  return (
    <>
      <div className={styles.galleryGrid} data-gallery-layout={layout} data-roselle-memory-album>
        {images.map((image, index) => (
          <figure className={styles.galleryFigure} data-gallery-index={index} key={image.id}>
            <InvitationGalleryImage
              alt={image.alt}
              className={styles.galleryImage}
              src={image.src}
            />
            <button
              aria-haspopup="dialog"
              aria-label={`Buka foto ${index + 1} dari ${images.length}`}
              className={viewerStyles.openButton}
              data-roselle-gallery-open
              onClick={() => setActiveIndex(index)}
              type="button"
            >
              <span aria-hidden="true" className={viewerStyles.openHint}>
                Lihat foto
              </span>
            </button>
            <figcaption aria-hidden="true" data-roselle-memory-caption>
              {String(index + 1).padStart(2, '0')}
            </figcaption>
          </figure>
        ))}
      </div>

      {mounted && activeImage && activeIndex !== null
        ? createPortal(
            <div
              className={viewerStyles.backdrop}
              data-roselle-gallery-lightbox="v1"
              onMouseDown={(event) => {
                if (event.currentTarget === event.target) {
                  setActiveIndex(null);
                }
              }}
              onTouchEnd={(event) => handleTouchEnd(event.changedTouches[0]?.clientX ?? 0)}
              onTouchStart={(event) => {
                touchStartXRef.current = event.touches[0]?.clientX ?? null;
              }}
            >
              <div
                aria-label={`Foto ${activeIndex + 1} dari ${images.length}`}
                aria-modal="true"
                className={viewerStyles.dialog}
                role="dialog"
              >
                <div className={viewerStyles.topBar}>
                  <p aria-live="polite" className={viewerStyles.counter}>
                    {activeIndex + 1} / {images.length}
                  </p>
                  <button
                    aria-label="Tutup galeri"
                    className={viewerStyles.closeButton}
                    onClick={() => setActiveIndex(null)}
                    ref={closeButtonRef}
                    type="button"
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                </div>

                <div className={viewerStyles.imageStage} data-roselle-lightbox-stage>
                  <InvitationGalleryImage
                    alt={activeImage.alt}
                    fetchPriority="high"
                    loading="eager"
                    sizes="100vw"
                    src={activeImage.src}
                  />
                </div>

                {activeImage.alt ? <p className={viewerStyles.caption}>{activeImage.alt}</p> : null}

                {images.length > 1 ? (
                  <div className={viewerStyles.navigation}>
                    <button
                      aria-label="Foto sebelumnya"
                      className={viewerStyles.navigationButton}
                      data-lightbox-direction="previous"
                      onClick={() => move(-1)}
                      type="button"
                    >
                      <span aria-hidden="true">←</span>
                      <span>Sebelumnya</span>
                    </button>
                    <button
                      aria-label="Foto berikutnya"
                      className={viewerStyles.navigationButton}
                      data-lightbox-direction="next"
                      onClick={() => move(1)}
                      type="button"
                    >
                      <span>Berikutnya</span>
                      <span aria-hidden="true">→</span>
                    </button>
                  </div>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
