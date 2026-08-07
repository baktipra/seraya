'use client';

import { useMemo, useState } from 'react';

import { InvitationTemplateRenderer } from '@/modules/invitation-templates';
import { createInvitationEditorPreviewViewModel } from '@/modules/invitations/invitation-editor-local-state';
import type { InvitationDraftContent } from '@/modules/invitations/invitation-draft.schema';
import type { InvitationGalleryImage } from '@/modules/media/media.types';
import { createInvitationAudioPlaybackCapability } from '@/modules/media/invitation-audio-playback.types';
import type { PublishedInvitationSnapshot } from '@/modules/publications/publication.types';

import { useInvitationStudioState } from './invitation-studio-provider';
import type { InvitationStudioPublicationState } from './invitation-studio-preview.types';
import styles from './invitation-studio-preview-rail.module.css';

type PreviewRailVersion = 'draft' | 'published';

type InvitationStudioPreviewRailProps = {
  project: {
    event_date_primary: string | null;
    id: string;
  };
  publicationState: InvitationStudioPublicationState;
  publishedSnapshot: PublishedInvitationSnapshot | null;
};

function getPreviewGalleryImages(
  content: InvitationDraftContent,
  version: PreviewRailVersion,
): InvitationGalleryImage[] {
  return content.gallery.imageIds.map((id, index) => ({
    alt: `Foto pasangan ${index + 1}`,
    id,
    src: version === 'published' ? `/media/${id}` : `/dashboard/media/${id}`,
  }));
}

export function InvitationStudioPreviewRail({
  project,
  publicationState,
  publishedSnapshot,
}: InvitationStudioPreviewRailProps) {
  const { content: localContent, isDirty, savePresentation } = useInvitationStudioState();
  const [version, setVersion] = useState<PreviewRailVersion>('draft');
  const hasPublishedVersion = Boolean(publishedSnapshot);
  const selectedContent =
    version === 'published' && publishedSnapshot ? publishedSnapshot.snapshot.draft : localContent;
  const selectedEventDatePrimary =
    version === 'published' && publishedSnapshot
      ? publishedSnapshot.snapshot.project.eventDatePrimary
      : project.event_date_primary;
  const galleryImages = useMemo(
    () => getPreviewGalleryImages(selectedContent, version),
    [selectedContent, version],
  );
  const invitation = useMemo(
    () =>
      createInvitationEditorPreviewViewModel({
        content: selectedContent,
        galleryImages,
        project: { event_date_primary: selectedEventDatePrimary },
      }),
    [galleryImages, selectedContent, selectedEventDatePrimary],
  );
  const audioRequestUrl =
    version === 'published' && publishedSnapshot
      ? `/api/invitations/${encodeURIComponent(publishedSnapshot.slug)}/audio/playback`
      : `/api/projects/${encodeURIComponent(project.id)}/audio/playback`;
  const draftTruth = isDirty
    ? 'Perubahan lokal belum disimpan'
    : publicationState === 'published_with_unpublished_changes'
      ? 'Berisi perubahan belum terbit'
      : savePresentation.state === 'saved'
        ? 'Draf terbaru tersimpan'
        : 'Pratinjau draf';
  const truthLabel =
    version === 'published'
      ? publishedSnapshot
        ? `Versi tamu · revisi ${publishedSnapshot.revision}`
        : 'Belum ada versi terbit'
      : draftTruth;

  return (
    <section
      aria-labelledby="invitation-preview-rail-title"
      className={styles.rail}
      data-invitation-preview-rail
      data-preview-rail-version={version}
    >
      <div className={styles.tabs} role="tablist" aria-label="Versi pratinjau undangan">
        <button
          aria-controls="invitation-preview-rail-panel"
          aria-selected={version === 'draft'}
          className={styles.tab}
          data-selected={version === 'draft' || undefined}
          id="invitation-preview-rail-draft-tab"
          onClick={() => setVersion('draft')}
          role="tab"
          type="button"
        >
          Draf
        </button>
        <button
          aria-controls="invitation-preview-rail-panel"
          aria-selected={version === 'published'}
          className={styles.tab}
          data-selected={version === 'published' || undefined}
          disabled={!hasPublishedVersion}
          id="invitation-preview-rail-published-tab"
          onClick={() => setVersion('published')}
          role="tab"
          type="button"
        >
          Versi Tamu
        </button>
      </div>

      <div className={styles.truth} data-preview-rail-truth>
        <span aria-hidden="true">☼</span>
        <div>
          <p id="invitation-preview-rail-title">{truthLabel}</p>
          {version === 'published' ? (
            <small>Snapshot yang sedang digunakan undangan tamu.</small>
          ) : isDirty ? (
            <small>Preview mengikuti perubahan yang masih berada di browser ini.</small>
          ) : publicationState === 'published_with_unpublished_changes' ? (
            <small>Draf privat lebih baru daripada versi yang sedang dilihat tamu.</small>
          ) : (
            <small>Preview mengikuti draf privat kalian.</small>
          )}
        </div>
      </div>

      <div
        aria-labelledby={
          version === 'draft'
            ? 'invitation-preview-rail-draft-tab'
            : 'invitation-preview-rail-published-tab'
        }
        className={styles.panel}
        id="invitation-preview-rail-panel"
        role="tabpanel"
      >
        <div className={styles.deviceShell}>
          <span aria-hidden="true" className={styles.deviceSpeaker} />
          <div
            aria-label="Preview ponsel undangan yang dapat digulir"
            className={styles.deviceScreen}
            role="region"
            tabIndex={0}
          >
            <InvitationTemplateRenderer
              audioPlayback={createInvitationAudioPlaybackCapability({
                configuration: selectedContent.audio,
                requestUrl: audioRequestUrl,
              })}
              invitation={invitation}
              paletteKey={selectedContent.paletteKey}
              surface="generic"
              templateKey={selectedContent.templateKey}
            />
          </div>
          <span aria-hidden="true" className={styles.deviceHomeIndicator} />
        </div>
      </div>

      <dl className={styles.meta}>
        <div>
          <dt>Tema aktif</dt>
          <dd>{selectedContent.templateKey}</dd>
        </div>
        <div>
          <dt>Versi</dt>
          <dd>
            {version === 'published' && publishedSnapshot
              ? `Revisi ${publishedSnapshot.revision}`
              : 'Draf'}
          </dd>
        </div>
      </dl>

      {!hasPublishedVersion ? (
        <p className={styles.emptyPublished}>Belum ada versi terbit. Versi Tamu tersedia setelah undangan pertama kali diterbitkan.</p>
      ) : null}
    </section>
  );
}
