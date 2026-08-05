'use client';

import { useMemo, useState } from 'react';

import { Button } from '@/design-system';
import {
  createPublicShareCopy,
  getPublicShareCtaLabel,
  PUBLIC_SHARE_CTA_OPTIONS,
  type PublicShareCta,
  type PublicSocialShareModel,
} from '@/modules/public-social-share/public-social-share.core';

type PublicSocialShareKitProps = {
  model: PublicSocialShareModel;
  projectId: string;
};

function safeFileName(coupleLabel: string) {
  return coupleLabel
    .toLocaleLowerCase('id-ID')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function PublicSocialShareKit({ model, projectId }: PublicSocialShareKitProps) {
  const [cta, setCta] = useState<PublicShareCta>('open_invitation');
  const [showQr, setShowQr] = useState(true);
  const [showVenue, setShowVenue] = useState(false);
  const [showSerayaBrand, setShowSerayaBrand] = useState(true);
  const [showSafeArea, setShowSafeArea] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [shareCopy, setShareCopy] = useState(() => createPublicShareCopy(model));

  const storyUrl = useMemo(() => {
    const query = new URLSearchParams({
      cta,
      showQr: showQr ? '1' : '0',
      showSerayaBrand: showSerayaBrand ? '1' : '0',
      showVenue: showVenue ? '1' : '0',
    });
    return `/api/projects/${projectId}/public-share/story?${query.toString()}`;
  }, [cta, projectId, showQr, showSerayaBrand, showVenue]);
  const qrUrl = `/api/projects/${projectId}/public-share/qr`;

  async function copyText(value: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(value);
      setFeedback(successMessage);
    } catch {
      setFeedback('Salin secara manual dari kolom yang tersedia.');
    }
  }

  async function shareThroughDevice() {
    try {
      if (!navigator.share) {
        await copyText(model.publicUrl, 'Link publik disalin sebagai fallback.');
        return;
      }

      const response = await fetch(storyUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error('Story unavailable');
      const blob = await response.blob();
      const file = new File([blob], `seraya-${safeFileName(model.coupleLabel)}-story.png`, {
        type: 'image/png',
      });
      const shareData: ShareData = {
        text: shareCopy,
        title: `Undangan ${model.coupleLabel}`,
        url: model.publicUrl,
      };

      if (navigator.canShare?.({ files: [file] })) {
        shareData.files = [file];
      }

      await navigator.share(shareData);
      setFeedback('Menu berbagi perangkat sudah dibuka.');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setFeedback('Bagikan belum berhasil. Story tetap dapat diunduh dan link dapat disalin.');
    }
  }

  return (
    <section
      aria-labelledby="public-share-title"
      className="border-seraya-line bg-seraya-surface mb-8 rounded-[var(--seraya-radius-lg)] border p-4 shadow-sm sm:p-6"
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.82fr)_minmax(22rem,1.18fr)]">
        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-seraya-text-muted text-xs font-semibold tracking-[0.18em] uppercase">
              Bagikan undangan publik
            </p>
            <h2 id="public-share-title" className="text-seraya-text text-xl font-semibold">
              Story dan QR publik
            </h2>
            <p className="text-seraya-text-muted text-sm leading-6">
              Aset ini hanya memakai versi publik terakhir. Nama tamu, tautan personal, RSVP, dan
              status pengiriman tidak pernah dimasukkan.
            </p>
          </div>

          <div className="border-seraya-line bg-seraya-canvas rounded-[var(--seraya-radius-md)] border p-4">
            <p className="text-seraya-text text-sm font-semibold">Versi publik siap dibagikan</p>
            <p className="text-seraya-text-muted mt-1 text-xs leading-5">
              Snapshot revisi {model.revision}. Story akan mengikuti isi yang terakhir diterbitkan,
              bukan perubahan draft yang belum dipublish.
            </p>
          </div>

          <label className="grid gap-2 text-sm font-medium">
            CTA Story
            <select
              className="border-seraya-line bg-seraya-surface focus-visible:outline-seraya-focus-ring min-h-11 rounded-[var(--seraya-radius-sm)] border px-3"
              onChange={(event) => setCta(event.target.value as PublicShareCta)}
              value={cta}
            >
              {PUBLIC_SHARE_CTA_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {getPublicShareCtaLabel(option)}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="grid gap-3">
            <legend className="mb-2 text-sm font-semibold">Informasi yang ditampilkan</legend>
            {[
              ['show-qr', 'Tampilkan QR', showQr, setShowQr],
              ['show-venue', 'Tampilkan venue', showVenue, setShowVenue],
              ['show-brand', 'Tampilkan branding Seraya', showSerayaBrand, setShowSerayaBrand],
              ['show-safe-area', 'Tampilkan panduan safe area pada preview', showSafeArea, setShowSafeArea],
            ].map(([id, label, checked, setter]) => (
              <label key={String(id)} className="flex min-h-11 items-center gap-3 text-sm">
                <input
                  checked={Boolean(checked)}
                  className="h-4 w-4"
                  id={String(id)}
                  onChange={(event) => (setter as (value: boolean) => void)(event.target.checked)}
                  type="checkbox"
                />
                {String(label)}
              </label>
            ))}
          </fieldset>

          <label className="grid gap-2 text-sm font-medium">
            Teks berbagi
            <textarea
              className="border-seraya-line bg-seraya-surface focus-visible:outline-seraya-focus-ring min-h-40 resize-y rounded-[var(--seraya-radius-sm)] border p-3 text-sm leading-6"
              maxLength={1200}
              onChange={(event) => setShareCopy(event.target.value)}
              value={shareCopy}
            />
          </label>

          <div className="grid gap-2 sm:grid-cols-2">
            <a
              className="bg-seraya-action-primary text-seraya-on-action focus-visible:outline-seraya-focus-ring inline-flex min-h-11 items-center justify-center rounded-[var(--seraya-radius-sm)] px-4 text-sm font-semibold focus-visible:outline-3 focus-visible:outline-offset-3"
              download={`seraya-${safeFileName(model.coupleLabel)}-instagram-story.png`}
              href={storyUrl}
            >
              Unduh Story
            </a>
            <a
              className="border-seraya-line text-seraya-text focus-visible:outline-seraya-focus-ring inline-flex min-h-11 items-center justify-center rounded-[var(--seraya-radius-sm)] border px-4 text-sm font-semibold focus-visible:outline-3 focus-visible:outline-offset-3"
              download={`seraya-${safeFileName(model.coupleLabel)}-qr.png`}
              href={qrUrl}
            >
              Unduh QR
            </a>
            <Button onClick={() => copyText(model.publicUrl, 'Link publik disalin.')} type="button">
              Salin link publik
            </Button>
            <Button onClick={shareThroughDevice} type="button" variant="secondary">
              Bagikan melalui perangkat
            </Button>
          </div>

          <p aria-live="polite" className="text-seraya-text-muted min-h-5 text-xs">
            {feedback}
          </p>
        </div>

        <div className="mx-auto w-full max-w-[28rem]">
          <div className="relative aspect-[9/16] overflow-hidden rounded-[1.5rem] bg-black shadow-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={`Preview Instagram Story untuk ${model.coupleLabel}`}
              className="h-full w-full object-cover"
              src={storyUrl}
            />
            {showSafeArea ? (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-[4%_8.3%_16.7%] border border-dashed border-white/80"
              />
            ) : null}
          </div>
          <p className="text-seraya-text-muted mt-3 text-center text-xs leading-5">
            Preview 1080 × 1920. Garis safe area hanya terlihat di preview dan tidak ikut diekspor.
          </p>
        </div>
      </div>
    </section>
  );
}
