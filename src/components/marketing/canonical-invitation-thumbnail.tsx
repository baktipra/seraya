import type { CSSProperties } from 'react';

import type { InvitationTemplateKey } from '@/modules/invitation-templates/core/theme-package.registry';

import { CANONICAL_THUMBNAIL_WEBP_READY } from './canonical-thumbnail-capture-status';

type CanonicalInvitationThumbnailVariant = 'card' | 'showcase';

type CanonicalInvitationThumbnailProps = {
  className?: string;
  paletteCanvas: string;
  paletteKey: string;
  paletteName: string;
  priority?: boolean;
  templateKey: InvitationTemplateKey;
  variant?: CanonicalInvitationThumbnailVariant;
};

const STATIC_THUMBNAIL_VERSION = 'v4g';

const imageClassByVariant: Record<CanonicalInvitationThumbnailVariant, string> = {
  card: 'object-top',
  showcase: 'object-top',
};

export function getCanonicalInvitationThumbnailHref(
  templateKey: InvitationTemplateKey,
  paletteKey: string,
) {
  return `/templates/${templateKey}/demo/generic?palette=${encodeURIComponent(
    paletteKey,
  )}&embed=thumbnail`;
}

export function getCanonicalInvitationThumbnailAssetHref(
  templateKey: InvitationTemplateKey,
  paletteKey: string,
  extension: 'svg' | 'webp',
) {
  if (extension === 'svg') {
    return `/invitation-thumbnails/${STATIC_THUMBNAIL_VERSION}/${templateKey}.svg`;
  }

  return `/invitation-thumbnails/${STATIC_THUMBNAIL_VERSION}/${templateKey}-${paletteKey}.webp`;
}

export function CanonicalInvitationThumbnail({
  className = '',
  paletteCanvas,
  paletteKey,
  paletteName,
  priority = false,
  templateKey,
  variant = 'card',
}: CanonicalInvitationThumbnailProps) {
  const fallbackHref = getCanonicalInvitationThumbnailAssetHref(templateKey, paletteKey, 'svg');
  const webpHref = getCanonicalInvitationThumbnailAssetHref(templateKey, paletteKey, 'webp');
  const thumbnailStyle: CSSProperties = {
    backgroundColor: paletteCanvas,
  };

  return (
    <div
      aria-label={`Pratinjau tema ${templateKey} dengan palette ${paletteName}, ditangkap dari renderer undangan canonical`}
      className={`relative isolate overflow-hidden text-[var(--seraya-text-primary)] ${className}`}
      data-canonical-thumbnail-palette={paletteKey}
      data-canonical-thumbnail-source="static-canonical-capture"
      data-canonical-thumbnail-template={templateKey}
      data-canonical-thumbnail-version={STATIC_THUMBNAIL_VERSION}
      data-marketing-invitation-preview={templateKey}
      role="img"
      style={thumbnailStyle}
    >
      <picture aria-hidden="true">
        {CANONICAL_THUMBNAIL_WEBP_READY ? (
          <source srcSet={webpHref} type="image/webp" />
        ) : null}
        <img
          alt=""
          className={`pointer-events-none absolute inset-0 h-full w-full object-cover opacity-95 mix-blend-multiply ${imageClassByVariant[variant]}`}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          height={932}
          loading={priority ? 'eager' : 'lazy'}
          src={fallbackHref}
          width={430}
        />
      </picture>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_70%,rgb(20_16_15_/_0.16))] ring-1 ring-inset ring-black/8"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-3 bottom-3 rounded-full border border-white/55 bg-white/82 px-2.5 py-1 text-[0.56rem] font-extrabold tracking-[0.11em] text-black/60 uppercase shadow-sm backdrop-blur-md"
      >
        Snapshot renderer · {paletteName}
      </span>
    </div>
  );
}
