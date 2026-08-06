'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { Badge } from '@/design-system';
import {
  InvitationTemplateRenderer,
  type InvitationViewModel,
  type PersonalInvitationPresentationSlotsV1,
} from '@/modules/invitation-templates';
import { createInvitationEditorPreviewViewModel } from '@/modules/invitations/invitation-editor-local-state';
import type { InvitationDraftContent } from '@/modules/invitations/invitation-draft.schema';
import type { InvitationDraft } from '@/modules/invitations/invitation-draft.types';
import { createInvitationAudioPlaybackCapability } from '@/modules/media/invitation-audio-playback.types';
import type { InvitationGalleryImage } from '@/modules/media/media.types';
import type { PublishedInvitationSnapshot } from '@/modules/publications/publication.types';

import { useInvitationStudioState } from './invitation-studio-provider';
import {
  getInvitationStudioPreviewVersionLabel,
  type InvitationStudioPreviewSurface,
  type InvitationStudioPreviewVersion,
  type InvitationStudioPreviewViewport,
  type InvitationStudioPublicationState,
} from './invitation-studio-preview.types';
import styles from './invitation-studio-preview-mode.module.css';

type PreviewTruthTone = 'brand' | 'neutral' | 'success' | 'warning';

export type InvitationStudioPreviewTruth = {
  description: string;
  label: string;
  state: 'local-clean' | 'local-dirty' | 'published' | 'saved';
  tone: PreviewTruthTone;
};

export function getInvitationStudioPreviewTruth(input: {
  isDirty: boolean;
  publicationState: InvitationStudioPublicationState;
  publishedRevision: number | null;
  version: InvitationStudioPreviewVersion;
}): InvitationStudioPreviewTruth {
  if (input.version === 'local') {
    return input.isDirty
      ? {
          description:
            'Renderer membaca perubahan yang masih berada di browser ini. Tamu dan draf server belum melihat perubahan tersebut.',
          label: 'Perubahan lokal belum tersimpan',
          state: 'local-dirty',
          tone: 'warning',
        }
      : {
          description:
            'Tidak ada perubahan lokal yang berbeda. Tampilan ini sama dengan draf privat terakhir yang tersimpan.',
          label: 'Lokal sama dengan draf tersimpan',
          state: 'local-clean',
          tone: 'neutral',
        };
  }

  if (input.version === 'published') {
    return {
      description:
        'Renderer membaca snapshot immutable yang saat ini digunakan oleh undangan tamu.',
      label: input.publishedRevision
        ? `Versi terbit · Revisi ${input.publishedRevision}`
        : 'Versi terbit',
      state: 'published',
      tone: 'success',
    };
  }

  const relationship =
    input.publicationState === 'published_with_unpublished_changes'
      ? 'Draf ini lebih baru daripada versi yang sedang dilihat tamu.'
      : input.publicationState === 'published'
        ? 'Draf tersimpan dan versi terbit sedang sinkron.'
        : 'Draf ini belum menjadi undangan tamu.';

  return {
    description: `Renderer membaca draf privat terakhir yang berhasil disimpan. ${relationship}`,
    label: 'Draf tersimpan',
    state: 'saved',
    tone: 'brand',
  };
}

function getPreviewGalleryImages(
  content: InvitationDraftContent,
  version: InvitationStudioPreviewVersion,
): InvitationGalleryImage[] {
  return content.gallery.imageIds.map((id, index) => ({
    alt: `Foto pasangan ${index + 1}`,
    id,
    src: version === 'published' ? `/media/${id}` : `/dashboard/media/${id}`,
  }));
}

function createPreviewPersonalSlots(
  invitation: InvitationViewModel,
): PersonalInvitationPresentationSlotsV1 {
  const coupleLabel = `${invitation.couple.personOne.displayName} & ${invitation.couple.personTwo.displayName}`;

  return {
    greeting: (
      <div data-invitation-preview-personal-slot="greeting">
        <p className={styles.personalEyebrow}>Kepada Yth.</p>
        <p className={styles.personalGuestName}>Bapak/Ibu Keluarga Pramudia</p>
        <p className={styles.personalLead}>
          Dengan penuh rasa bahagia, kami mengundang Anda dan keluarga untuk hadir serta menyertai
          hari pernikahan kami.
        </p>
      </div>
    ),
    rsvp: (
      <section className={styles.personalPanel} data-invitation-preview-personal-slot="rsvp">
        <p className={styles.personalEyebrow}>Simulasi personal</p>
        <h3 className={styles.personalHeading}>Konfirmasi Kehadiran</h3>
        <p className={styles.personalLead}>
          Tampilan ini tidak membuat guest-link dan tidak menyimpan jawaban.
        </p>
        <div className={styles.personalActions}>
          <button disabled type="button">
            Hadir
          </button>
          <button disabled type="button">
            Tidak hadir
          </button>
        </div>
      </section>
    ),
    guestbook: (
      <section className={styles.personalPanel} data-invitation-preview-personal-slot="guestbook">
        <p className={styles.personalEyebrow}>Simulasi personal</p>
        <h3 className={styles.personalHeading}>Titipkan Ucapan</h3>
        <textarea
          aria-label="Contoh kolom ucapan yang tidak aktif"
          disabled
          placeholder={`Doa dan ucapan untuk ${coupleLabel}`}
        />
        <button disabled type="button">
          Kirim ucapan
        </button>
      </section>
    ),
  };
}

function updatePreviewQuery(input: {
  surface: InvitationStudioPreviewSurface;
  version: InvitationStudioPreviewVersion;
  viewport: InvitationStudioPreviewViewport;
}) {
  const url = new URL(window.location.href);
  url.searchParams.set('mode', 'preview');
  url.searchParams.set('version', input.version);
  url.searchParams.set('surface', input.surface);
  url.searchParams.set('viewport', input.viewport);
  window.history.pushState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
}

export type InvitationStudioPreviewModeProps = {
  initialSurface: InvitationStudioPreviewSurface;
  initialVersion: InvitationStudioPreviewVersion;
  initialViewport: InvitationStudioPreviewViewport;
  project: {
    event_date_primary: string | null;
    id: string;
  };
  publicationState: InvitationStudioPublicationState;
  publishedSnapshot: PublishedInvitationSnapshot | null;
  savedDraft: InvitationDraft;
};

export function InvitationStudioPreviewMode({
  initialSurface,
  initialVersion,
  initialViewport,
  project,
  publicationState,
  publishedSnapshot,
  savedDraft,
}: InvitationStudioPreviewModeProps) {
  const { content: localContent, isDirty } = useInvitationStudioState();
  const [version, setVersion] = useState<InvitationStudioPreviewVersion>(initialVersion);
  const [surface, setSurface] = useState<InvitationStudioPreviewSurface>(initialSurface);
  const [viewport, setViewport] = useState<InvitationStudioPreviewViewport>(initialViewport);
  const hasPublishedVersion = Boolean(publishedSnapshot);

  useEffect(() => {
    const handlePopState = () => {
      const url = new URL(window.location.href);
      const nextVersion = url.searchParams.get('version');
      const nextSurface = url.searchParams.get('surface');
      const nextViewport = url.searchParams.get('viewport');

      setVersion(
        nextVersion === 'published' && hasPublishedVersion
          ? 'published'
          : nextVersion === 'saved'
            ? 'saved'
            : 'local',
      );
      setSurface(nextSurface === 'personal' ? 'personal' : 'generic');
      setViewport(nextViewport === 'desktop' ? 'desktop' : 'mobile');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [hasPublishedVersion]);

  const selectedContent =
    version === 'local'
      ? localContent
      : version === 'published' && publishedSnapshot
        ? publishedSnapshot.snapshot.draft
        : savedDraft.content;
  const selectedProject = {
    event_date_primary:
      version === 'published' && publishedSnapshot
        ? publishedSnapshot.snapshot.project.eventDatePrimary
        : project.event_date_primary,
  };
  const galleryImages = useMemo(
    () => getPreviewGalleryImages(selectedContent, version),
    [selectedContent, version],
  );
  const invitation = useMemo(
    () =>
      createInvitationEditorPreviewViewModel({
        content: selectedContent,
        galleryImages,
        project: selectedProject,
      }),
    [galleryImages, selectedContent, selectedProject.event_date_primary],
  );
  const personalSlots = surface === 'personal' ? createPreviewPersonalSlots(invitation) : undefined;
  const truth = getInvitationStudioPreviewTruth({
    isDirty,
    publicationState,
    publishedRevision: publishedSnapshot?.revision ?? null,
    version,
  });
  const audioRequestUrl =
    version === 'published' && publishedSnapshot
      ? `/api/invitations/${encodeURIComponent(publishedSnapshot.slug)}/audio/playback`
      : `/api/projects/${encodeURIComponent(project.id)}/audio/playback`;

  function selectVersion(nextVersion: InvitationStudioPreviewVersion) {
    if (nextVersion === 'published' && !hasPublishedVersion) return;
    setVersion(nextVersion);
    updatePreviewQuery({ surface, version: nextVersion, viewport });
  }

  function selectSurface(nextSurface: InvitationStudioPreviewSurface) {
    setSurface(nextSurface);
    updatePreviewQuery({ surface: nextSurface, version, viewport });
  }

  function selectViewport(nextViewport: InvitationStudioPreviewViewport) {
    setViewport(nextViewport);
    updatePreviewQuery({ surface, version, viewport: nextViewport });
  }

  return (
    <section
      aria-labelledby="invitation-studio-preview-title"
      className={styles.mode}
      data-invitation-studio-preview-mode="canonical"
      data-preview-surface={surface}
      data-preview-version={version}
      data-preview-viewport={viewport}
    >
      <header className={styles.header}>
        <div className={styles.headerCopy}>
          <p className={styles.eyebrow}>Mode Preview</p>
          <h2 className={styles.title} id="invitation-studio-preview-title">
            Periksa versi yang tepat sebelum mengambil keputusan.
          </h2>
          <p className={styles.description}>
            Bandingkan perubahan lokal, draf tersimpan, dan snapshot yang sedang dilihat tamu tanpa
            mencampurkan ketiganya.
          </p>
        </div>
        <Badge variant={truth.tone}>{truth.label}</Badge>
      </header>

      <section aria-label="Pilih versi undangan" className={styles.versionSection}>
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.controlLabel}>Sumber versi</p>
            <p className={styles.controlHelp}>{truth.description}</p>
          </div>
          {publishedSnapshot ? (
            <Link
              className={styles.liveLink}
              href={`/${publishedSnapshot.slug}`}
              rel="noreferrer"
              target="_blank"
            >
              Buka undangan terbit
            </Link>
          ) : null}
        </div>

        <div className={styles.versionGrid} role="radiogroup" aria-label="Versi preview">
          {(['local', 'saved', 'published'] as const).map((candidate) => {
            const disabled = candidate === 'published' && !hasPublishedVersion;
            const selected = candidate === version;
            const meta =
              candidate === 'local'
                ? isDirty
                  ? 'Ada perubahan browser'
                  : 'Sama dengan draf tersimpan'
                : candidate === 'saved'
                  ? publicationState === 'published_with_unpublished_changes'
                    ? 'Lebih baru dari versi terbit'
                    : 'Draf privat terakhir'
                  : publishedSnapshot
                    ? `Revisi ${publishedSnapshot.revision}`
                    : 'Belum pernah diterbitkan';

            return (
              <button
                aria-checked={selected}
                className={styles.versionCard}
                data-selected={selected || undefined}
                disabled={disabled}
                key={candidate}
                onClick={() => selectVersion(candidate)}
                role="radio"
                type="button"
              >
                <span>{getInvitationStudioPreviewVersionLabel(candidate)}</span>
                <small>{meta}</small>
              </button>
            );
          })}
        </div>
      </section>

      <section aria-label="Kontrol pengalaman preview" className={styles.controlBar}>
        <div>
          <p className={styles.controlLabel}>Pengalaman tamu</p>
          <div className={styles.segmented} role="group" aria-label="Pengalaman tamu">
            <button
              aria-pressed={surface === 'generic'}
              data-selected={surface === 'generic' || undefined}
              onClick={() => selectSurface('generic')}
              type="button"
            >
              Undangan umum
            </button>
            <button
              aria-pressed={surface === 'personal'}
              data-selected={surface === 'personal' || undefined}
              onClick={() => selectSurface('personal')}
              type="button"
            >
              Simulasi personal
            </button>
          </div>
        </div>
        <div>
          <p className={styles.controlLabel}>Ukuran layar</p>
          <div className={styles.segmented} role="group" aria-label="Ukuran layar preview">
            <button
              aria-pressed={viewport === 'mobile'}
              data-selected={viewport === 'mobile' || undefined}
              onClick={() => selectViewport('mobile')}
              type="button"
            >
              Ponsel
            </button>
            <button
              aria-pressed={viewport === 'desktop'}
              data-selected={viewport === 'desktop' || undefined}
              onClick={() => selectViewport('desktop')}
              type="button"
            >
              Desktop
            </button>
          </div>
        </div>
      </section>

      {surface === 'personal' ? (
        <p className={styles.personalNotice}>
          Simulasi menggunakan nama tamu contoh. Tidak ada guest-link, RSVP, atau ucapan yang dibuat
          maupun disimpan.
        </p>
      ) : null}

      <section className={styles.previewCard} aria-label="Renderer exact undangan">
        <div className={styles.previewTopbar}>
          <div>
            <strong>{truth.label}</strong>
            <span>{surface === 'personal' ? 'Simulasi personal' : 'Undangan umum'}</span>
          </div>
          <span>{viewport === 'mobile' ? 'Komposisi ponsel' : 'Komposisi desktop'}</span>
        </div>
        <div className={styles.previewStage}>
          <div className={styles.deviceShell} data-preview-device={viewport}>
            <span aria-hidden="true" className={styles.deviceSpeaker} />
            <div
              aria-label={`Preview ${viewport === 'mobile' ? 'ponsel' : 'desktop'} yang dapat digulir`}
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
                personalSlots={personalSlots}
                surface={surface}
                templateKey={selectedContent.templateKey}
              />
            </div>
            <span aria-hidden="true" className={styles.deviceHomeIndicator} />
          </div>
        </div>
      </section>
    </section>
  );
}
