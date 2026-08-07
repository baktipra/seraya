'use client';

import dynamic from 'next/dynamic';
import { memo, useDeferredValue, useEffect, useMemo, useState } from 'react';

import { createInvitationEditorPreviewViewModel } from '@/modules/invitations/invitation-editor-local-state';
import type { InvitationDraftContent } from '@/modules/invitations/invitation-draft.schema';
import type { InvitationGalleryImage } from '@/modules/media/media.types';
import { createInvitationAudioPlaybackCapability } from '@/modules/media/invitation-audio-playback.types';
import type { PublishedInvitationSnapshot } from '@/modules/publications/publication.types';

import { useInvitationStudioState } from './invitation-studio-provider';
import type { InvitationStudioPublicationState } from './invitation-studio-preview.types';
import styles from './invitation-studio-preview-rail.module.css';

const DeferredInvitationTemplateRenderer = dynamic(
  () =>
    import('@/modules/invitation-templates').then((module) => module.InvitationTemplateRenderer),
  {
    loading: () => (
      <div className={styles.runtimePlaceholder} role="status">
        Menyiapkan pratinjau…
      </div>
    ),
    ssr: false,
  },
);

type PreviewRailVersion = 'draft' | 'published';

type InvitationStudioPreviewRailProps = {
  project: {
    event_date_primary: string | null;
    id: string;
  };
  publicationState: InvitationStudioPublicationState;
  publishedSnapshot: PublishedInvitationSnapshot | null;
};

type IdleWindow = Window & {
  cancelIdleCallback?: (handle: number) => void;
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
};

type PreviewCanvasProps = {
  audioRequestUrl: string;
  content: InvitationDraftContent;
  eventDatePrimary: string | null;
  version: PreviewRailVersion;
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

const PreviewCanvas = memo(function PreviewCanvas({
  audioRequestUrl,
  content,
  eventDatePrimary,
  version,
}: PreviewCanvasProps) {
  const [rendererReady, setRendererReady] = useState(false);
  const galleryImages = useMemo(
    () => getPreviewGalleryImages(content, version),
    [content, version],
  );
  const invitation = useMemo(
    () =>
      createInvitationEditorPreviewViewModel({
        content,
        galleryImages,
        project: { event_date_primary: eventDatePrimary },
      }),
    [content, eventDatePrimary, galleryImages],
  );

  useEffect(() => {
    const idleWindow = window as IdleWindow;
    if (idleWindow.requestIdleCallback) {
      const idleHandle = idleWindow.requestIdleCallback(() => setRendererReady(true), {
        timeout: 800,
      });
      return () => idleWindow.cancelIdleCallback?.(idleHandle);
    }

    const timeoutHandle = window.setTimeout(() => setRendererReady(true), 120);
    return () => window.clearTimeout(timeoutHandle);
  }, []);

  if (!rendererReady) {
    return (
      <div className={styles.runtimePlaceholder} role="status">
        Menyiapkan pratinjau…
      </div>
    );
  }

  return (
    <DeferredInvitationTemplateRenderer
      audioPlayback={createInvitationAudioPlaybackCapability({
        configuration: content.audio,
        requestUrl: audioRequestUrl,
      })}
      invitation={invitation}
      paletteKey={content.paletteKey}
      surface="generic"
      templateKey={content.templateKey}
    />
  );
});

export function InvitationStudioPreviewRail({
  project,
  publicationState,
  publishedSnapshot,
}: InvitationStudioPreviewRailProps) {
  const { content: localContent, isDirty, savePresentation } = useInvitationStudioState();
  const deferredLocalContent = useDeferredValue(localContent);
  const [version, setVersion] = useState<PreviewRailVersion>('draft');
  const [runtimeReady, setRuntimeReady] = useState(false);
  const hasPublishedVersion = Boolean(publishedSnapshot);
  const selectedContent =
    version === 'published' && publishedSnapshot
      ? publishedSnapshot.snapshot.draft
      : deferredLocalContent;
  const selectedEventDatePrimary =
    version === 'published' && publishedSnapshot
      ? publishedSnapshot.snapshot.project.eventDatePrimary
      : project.event_date_primary;
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
  const previewBuffering = version === 'draft' && deferredLocalContent !== localContent;

  useEffect(() => {
    const workspaceRoot = document.querySelector('[data-invitation-task-workspace]');
    const shellMetric = {
      dom_node_count: workspaceRoot?.querySelectorAll('*').length ?? 0,
      event: 'invitation_editor_shell_ready',
      mounted_panel_count:
        workspaceRoot?.querySelectorAll('[data-invitation-editor-panel]').length ?? 0,
      total_ms: Math.round(performance.now()),
    };

    console.info(
      JSON.stringify({
        level: 'info',
        source: 'invitation-editor-performance',
        ...shellMetric,
      }),
    );
    window.dispatchEvent(
      new CustomEvent('seraya:invitation-editor-performance', { detail: shellMetric }),
    );

    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        setRuntimeReady(true);
        const interactiveMetric = {
          dom_node_count: workspaceRoot?.querySelectorAll('*').length ?? 0,
          event: 'invitation_editor_interactive_ready',
          mounted_panel_count:
            workspaceRoot?.querySelectorAll('[data-invitation-editor-panel]').length ?? 0,
          total_ms: Math.round(performance.now()),
        };

        performance.mark('seraya:invitation-editor:interactive-ready');
        console.info(
          JSON.stringify({
            level: 'info',
            source: 'invitation-editor-performance',
            ...interactiveMetric,
          }),
        );
        window.dispatchEvent(
          new CustomEvent('seraya:invitation-editor-performance', {
            detail: interactiveMetric,
          }),
        );
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, []);

  return (
    <section
      aria-labelledby="invitation-preview-rail-title"
      className={styles.rail}
      data-invitation-editor-runtime-ready={runtimeReady ? 'true' : 'shell'}
      data-invitation-preview-rail
      data-preview-buffering={previewBuffering || undefined}
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
            <small>
              {previewBuffering
                ? 'Preview sedang menyusul perubahan lokal terbaru di browser ini.'
                : 'Preview mengikuti perubahan yang masih berada di browser ini.'}
            </small>
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
            <PreviewCanvas
              audioRequestUrl={audioRequestUrl}
              content={selectedContent}
              eventDatePrimary={selectedEventDatePrimary}
              version={version}
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
        <p className={styles.emptyPublished}>
          Belum ada versi terbit. Versi Tamu tersedia setelah undangan pertama kali diterbitkan.
        </p>
      ) : null}
    </section>
  );
}
