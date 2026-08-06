'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import type { InvitationAudioSummary } from '@/modules/media/invitation-audio.types';
import type { InvitationGalleryImage } from '@/modules/media/media.types';

import { GalleryManager } from './gallery-manager';
import { InvitationAudioManager } from './invitation-audio-manager';
import { useInvitationStudioState } from './invitation-studio-provider';
import styles from './invitation-studio-media-mode.module.css';

export type InvitationStudioMediaTab = 'audio' | 'gallery';

export function getInvitationStudioMediaSummary(input: {
  audio: InvitationAudioSummary | null;
  images: InvitationGalleryImage[];
}) {
  return {
    audioLabel: input.audio ? 'Audio siap' : 'Belum ada audio',
    galleryLabel: input.images.length > 0 ? `${input.images.length} foto aktif` : 'Belum ada foto',
  };
}

export type InvitationStudioMediaModeProps = {
  initialAudio: InvitationAudioSummary | null;
  initialImages: InvitationGalleryImage[];
  initialTab?: InvitationStudioMediaTab;
  isPublished: boolean;
  projectId: string;
};

export function InvitationStudioMediaMode({
  initialAudio,
  initialImages,
  initialTab = 'gallery',
  isPublished,
  projectId,
}: InvitationStudioMediaModeProps) {
  const router = useRouter();
  const { content, synchronizeLocalContent, updateLocalContent } = useInvitationStudioState();
  const [activeTab, setActiveTab] = useState<InvitationStudioMediaTab>(initialTab);
  const [audio, setAudio] = useState(initialAudio);
  const [images, setImages] = useState(initialImages);
  const summary = useMemo(
    () => getInvitationStudioMediaSummary({ audio, images }),
    [audio, images],
  );

  function handleImagesChange(nextImages: InvitationGalleryImage[]) {
    setImages(nextImages);
    synchronizeLocalContent({
      imageIds: nextImages.map((image) => image.id),
      type: 'gallery-assets',
    });
    router.refresh();
  }

  function handleAudioChange(nextAudio: InvitationAudioSummary | null) {
    setAudio(nextAudio);
    synchronizeLocalContent({
      audio: nextAudio
        ? {
            assetId: nextAudio.id,
            durationSeconds: nextAudio.durationSeconds,
            originalFileName: nextAudio.originalFileName,
            rightsAcknowledged: true,
          }
        : {
            assetId: null,
            durationSeconds: null,
            originalFileName: null,
            rightsAcknowledged: false,
          },
      type: 'audio-asset',
    });
    router.refresh();
  }

  return (
    <section
      aria-labelledby="invitation-studio-media-title"
      className={styles.mode}
      data-invitation-studio-media-mode="canonical"
    >
      <header className={styles.header}>
        <div className={styles.headerCopy}>
          <p className={styles.eyebrow}>Media undangan</p>
          <h2 className={styles.title} id="invitation-studio-media-title">
            Kelola galeri dan musik di satu tempat.
          </h2>
          <p className={styles.description}>
            Upload, urutkan, ganti, atau hapus aset privat project. Operasi file disimpan langsung
            setelah berhasil; pilihan apakah galeri tampil tetap mengikuti draf dan tombol Simpan
            perubahan di header.
          </p>
        </div>
        <dl className={styles.summary} aria-label="Ringkasan media undangan">
          <div>
            <dt>Galeri</dt>
            <dd data-media-gallery-summary>{summary.galleryLabel}</dd>
          </div>
          <div>
            <dt>Musik</dt>
            <dd data-media-audio-summary>{summary.audioLabel}</dd>
          </div>
        </dl>
      </header>

      <section
        aria-labelledby="gallery-visibility-title"
        className="border-seraya-border-default bg-seraya-surface flex flex-col gap-4 rounded-[var(--seraya-radius-lg)] border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
        data-media-gallery-visibility-control
      >
        <div className="min-w-0">
          <h3
            className="text-seraya-text-primary text-base font-semibold"
            id="gallery-visibility-title"
          >
            Tampilkan galeri pada undangan
          </h3>
          <p className="text-seraya-text-muted mt-1 max-w-2xl text-sm leading-6">
            Foto tetap aman ketika galeri disembunyikan. Perubahan ini baru terlihat oleh tamu
            setelah draf disimpan dan undangan diterbitkan atau diterbitkan ulang.
          </p>
        </div>
        <button
          aria-checked={content.gallery.enabled}
          className={[
            'focus-visible:outline-seraya-focus-ring inline-flex min-h-11 shrink-0 items-center gap-2.5 rounded-full border px-3.5 text-sm font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2',
            content.gallery.enabled
              ? 'border-seraya-action-primary bg-seraya-brand-soft text-seraya-action-primary'
              : 'border-seraya-border-default bg-seraya-canvas text-seraya-text-secondary',
          ].join(' ')}
          onClick={() =>
            updateLocalContent({ enabled: !content.gallery.enabled, type: 'gallery-visibility' })
          }
          role="switch"
          type="button"
        >
          <span
            aria-hidden="true"
            className={[
              'relative inline-flex h-6 w-11 rounded-full transition-colors',
              content.gallery.enabled ? 'bg-seraya-action-primary' : 'bg-seraya-border-strong',
            ].join(' ')}
          >
            <span
              className={[
                'absolute top-1 left-0 size-4 rounded-full bg-white shadow-sm transition-transform',
                content.gallery.enabled ? 'translate-x-6' : 'translate-x-1',
              ].join(' ')}
            />
          </span>
          {content.gallery.enabled ? 'Ditampilkan' : 'Disembunyikan'}
        </button>
      </section>

      <div className={styles.tabList} aria-label="Jenis media" role="tablist">
        <button
          aria-controls="invitation-studio-media-gallery-panel"
          aria-selected={activeTab === 'gallery'}
          className={styles.tab}
          data-selected={activeTab === 'gallery' || undefined}
          id="invitation-studio-media-gallery-tab"
          onClick={() => setActiveTab('gallery')}
          role="tab"
          type="button"
        >
          <span>Galeri</span>
          <small>{summary.galleryLabel}</small>
        </button>
        <button
          aria-controls="invitation-studio-media-audio-panel"
          aria-label={`Audio · ${summary.audioLabel}`}
          aria-selected={activeTab === 'audio'}
          className={styles.tab}
          data-selected={activeTab === 'audio' || undefined}
          id="invitation-studio-media-audio-tab"
          onClick={() => setActiveTab('audio')}
          role="tab"
          type="button"
        >
          <span>Musik</span>
          <small>{summary.audioLabel}</small>
        </button>
      </div>

      <div
        aria-labelledby="invitation-studio-media-gallery-tab"
        className={styles.panel}
        hidden={activeTab !== 'gallery'}
        id="invitation-studio-media-gallery-panel"
        role="tabpanel"
      >
        <div className={styles.truthNote}>
          <strong>Aset galeri tersimpan langsung.</strong>
          <span>
            Urutan, upload, dan penghapusan diperbarui pada draf privat melalui endpoint owner-only.
            Tamu baru melihat hasilnya setelah undangan diterbitkan atau diterbitkan ulang.
          </span>
        </div>
        <GalleryManager
          embedded
          initialImages={images}
          isPublished={isPublished}
          onImagesChange={handleImagesChange}
          projectId={projectId}
          showProjectBackLink={false}
        />
      </div>

      <div
        aria-labelledby="invitation-studio-media-audio-tab"
        className={styles.panel}
        hidden={activeTab !== 'audio'}
        id="invitation-studio-media-audio-panel"
        role="tabpanel"
      >
        <div className={styles.truthNote}>
          <strong>Satu file musik aktif per undangan.</strong>
          <span>
            Musik tetap privat, tidak menerima URL eksternal, dan hanya diputar ketika tamu memilih
            kontrol musik.
          </span>
        </div>
        <InvitationAudioManager
          embedded
          initialAudio={audio}
          isPublished={isPublished}
          onAudioChange={handleAudioChange}
          projectId={projectId}
        />
      </div>
    </section>
  );
}
