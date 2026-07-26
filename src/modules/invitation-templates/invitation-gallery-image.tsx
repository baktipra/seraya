'use client';

/* eslint-disable @next/next/no-img-element -- invitation galleries use Seraya-owned render-safe media URLs and keep their template-native crop geometry. */
import { useState } from 'react';

const DEFAULT_GALLERY_SIZES =
  '(max-width: 36rem) calc(100vw - 2rem), (max-width: 64rem) 42vw, 25rem';

export type InvitationGalleryImageProps = {
  alt: string;
  className: string;
  sizes?: string;
  src: string;
};

type InvitationMediaState = 'loading' | 'ready' | 'failed';

/**
 * One render-safe gallery image contract shared by every invitation collection.
 * The surrounding template still owns crop, rhythm, and composition.
 */
export function InvitationGalleryImage({
  alt,
  className,
  sizes = DEFAULT_GALLERY_SIZES,
  src,
}: InvitationGalleryImageProps) {
  const [mediaState, setMediaState] = useState<InvitationMediaState>('loading');

  return (
    <span data-invitation-media-frame data-media-state={mediaState}>
      <img
        alt={alt}
        className={className}
        data-invitation-media-image
        decoding="async"
        draggable={false}
        fetchPriority="low"
        height={1125}
        loading="lazy"
        onError={() => setMediaState('failed')}
        onLoad={() => setMediaState('ready')}
        sizes={sizes}
        src={src}
        width={900}
      />
      <span aria-hidden="true" data-invitation-media-shimmer />
      <span
        aria-live="polite"
        data-invitation-media-fallback
        hidden={mediaState !== 'failed'}
        role="status"
      >
        <span aria-hidden="true">✦</span>
        Foto belum dapat ditampilkan
      </span>
    </span>
  );
}
