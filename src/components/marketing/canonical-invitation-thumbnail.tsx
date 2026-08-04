import type { CSSProperties } from 'react';

import type { InvitationTemplateKey } from '@/modules/invitation-templates/core/theme-package.registry';

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

const iframeClassByVariant: Record<CanonicalInvitationThumbnailVariant, string> = {
  card: 'scale-[0.72] sm:scale-[0.78]',
  showcase: 'scale-[0.64] sm:scale-[0.68]',
};

export function getCanonicalInvitationThumbnailHref(
  templateKey: InvitationTemplateKey,
  paletteKey: string,
) {
  return `/templates/${templateKey}/demo/generic?palette=${encodeURIComponent(
    paletteKey,
  )}&embed=thumbnail`;
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
  const frameHref = getCanonicalInvitationThumbnailHref(templateKey, paletteKey);
  const thumbnailStyle: CSSProperties = {
    backgroundColor: paletteCanvas,
  };

  return (
    <div
      aria-label={`Pratinjau canonical tema ${templateKey} dengan palette ${paletteName} dari renderer undangan produksi`}
      className={`relative isolate overflow-hidden text-[var(--seraya-text-primary)] ${className}`}
      data-canonical-thumbnail-palette={paletteKey}
      data-canonical-thumbnail-source="showroom-renderer"
      data-canonical-thumbnail-template={templateKey}
      data-marketing-invitation-preview={templateKey}
      role="img"
      style={thumbnailStyle}
    >
      <iframe
        aria-hidden="true"
        className={`pointer-events-none absolute top-0 left-1/2 h-[932px] w-[430px] origin-top -translate-x-1/2 border-0 ${iframeClassByVariant[variant]}`}
        data-canonical-thumbnail-frame="true"
        loading={priority ? 'eager' : 'lazy'}
        referrerPolicy="no-referrer"
        sandbox=""
        scrolling="no"
        src={frameHref}
        tabIndex={-1}
        title={`${templateKey} ${paletteName} canonical renderer thumbnail`}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_70%,rgb(20_16_15_/_0.16))] ring-1 ring-inset ring-black/8"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-3 bottom-3 rounded-full border border-white/55 bg-white/82 px-2.5 py-1 text-[0.56rem] font-extrabold tracking-[0.11em] text-black/60 uppercase shadow-sm backdrop-blur-md"
      >
        Renderer asli · {paletteName}
      </span>
    </div>
  );
}
