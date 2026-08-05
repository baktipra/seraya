'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';

import { Badge } from '@/design-system';
import { focusFirstDescendant, trapFocusWithin } from '@/lib/focus-management';
import { InvitationTemplateRenderer } from '@/modules/invitation-templates';
import type { InvitationRendererProjectMetadata } from '@/modules/invitation-templates/invitation-view-model';
import { createInvitationEditorPreviewViewModel } from '@/modules/invitations/invitation-editor-local-state';
import type { InvitationDraftContent } from '@/modules/invitations/invitation-draft.schema';
import { createInvitationAudioPlaybackCapability } from '@/modules/media/invitation-audio-playback.types';
import type { InvitationAudioConfiguration } from '@/modules/media/invitation-audio.types';
import type { InvitationGalleryImage } from '@/modules/media/media.types';

import { useInvitationEditorContextualSaveAction } from './invitation-editor-contextual-actions';
import {
  invitationEditorSections,
  type InvitationEditorSectionKey,
} from './invitation-editor-workspace';
import styles from './invitation-editor-live-preview.module.css';

type InvitationPreviewViewport = 'desktop' | 'mobile';

type InvitationPreviewTargetState = 'available' | 'unavailable';

const previewTargetIds: Record<
  InvitationDraftContent['templateKey'],
  Partial<Record<InvitationEditorSectionKey, string>>
> = {
  aruna: {
    closing: 'aruna-closing-title',
    couple: 'aruna-couple-title',
    gallery: 'aruna-gallery-title',
    gift: 'aruna-digital-gift-title',
    schedule: 'aruna-events-title',
    story: 'aruna-story-title',
  },
  laras: {
    closing: 'laras-closing-title',
    couple: 'laras-couple-title',
    gallery: 'laras-gallery-title',
    gift: 'laras-digital-gift-title',
    schedule: 'laras-events-title',
    story: 'laras-story-title',
  },
  roselle: {
    closing: 'roselle-closing-title',
    couple: 'roselle-couple-title',
    gallery: 'roselle-gallery-title',
    gift: 'roselle-digital-gift-title',
    schedule: 'roselle-events-title',
    story: 'roselle-story-title',
  },
};

function isInvitationEditorSectionKey(value: string): value is InvitationEditorSectionKey {
  return invitationEditorSections.some((section) => section.key === value);
}

function getActivePreviewSection(): InvitationEditorSectionKey {
  if (typeof window === 'undefined') {
    return 'style';
  }

  const requestedSection = window.location.hash.replace('#bagian-', '');
  return isInvitationEditorSectionKey(requestedSection) ? requestedSection : 'style';
}

function isPreviewTargetAvailable(
  content: InvitationDraftContent,
  activeSection: InvitationEditorSectionKey,
) {
  switch (activeSection) {
    case 'story':
      return content.story.enabled;
    case 'schedule':
      return content.eventSchedule.events.length > 0;
    case 'gallery':
      return content.gallery.enabled && content.gallery.imageIds.length > 0;
    case 'gift':
      return content.digitalGift.enabled && content.digitalGift.accounts.length > 0;
    case 'rsvp':
      return content.rsvp.enabled;
    case 'closing':
      return content.closing.enabled;
    default:
      return true;
  }
}

export type InvitationEditorLivePreviewProps = {
  audio: InvitationAudioConfiguration;
  content: InvitationDraftContent;
  galleryImages: InvitationGalleryImage[];
  isDirty: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  project: InvitationRendererProjectMetadata;
  projectId: string;
};

export const InvitationEditorLivePreview = memo(function InvitationEditorLivePreview({
  audio,
  content,
  galleryImages,
  isDirty,
  isOpen,
  onOpenChange,
  project,
  projectId,
}: InvitationEditorLivePreviewProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const overlayRef = useRef<HTMLElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const onOpenChangeRef = useRef(onOpenChange);
  const screenRef = useRef<HTMLDivElement | null>(null);
  const scrollPositionRef = useRef(0);
  const [activeSection, setActiveSection] =
    useState<InvitationEditorSectionKey>(getActivePreviewSection);
  const [canUseDesktopViewport, setCanUseDesktopViewport] = useState(false);
  const [targetState, setTargetState] = useState<InvitationPreviewTargetState>('available');
  const [viewport, setViewport] = useState<InvitationPreviewViewport>('mobile');
  const invitation = useMemo(
    () =>
      createInvitationEditorPreviewViewModel({
        content,
        galleryImages,
        project,
      }),
    [content, galleryImages, project],
  );
  const activeChapter =
    invitationEditorSections.find((section) => section.key === activeSection) ??
    invitationEditorSections[0]!;
  const targetAvailable = isPreviewTargetAvailable(content, activeSection);
  const visibilitySignature = [
    content.templateKey,
    content.paletteKey,
    content.story.enabled,
    content.eventSchedule.events.length,
    content.gallery.enabled,
    content.gallery.imageIds.length,
    content.digitalGift.enabled,
    content.digitalGift.accounts.length,
    content.rsvp.enabled,
    content.closing.enabled,
  ].join(':');

  useInvitationEditorContextualSaveAction(isDirty);

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  useEffect(() => {
    const syncActiveSection = () => {
      const nextSection = getActivePreviewSection();
      setActiveSection((currentSection) =>
        currentSection === nextSection ? currentSection : nextSection,
      );
    };

    syncActiveSection();

    const observer = new MutationObserver(syncActiveSection);
    observer.observe(document.body, {
      attributeFilter: ['aria-current'],
      attributes: true,
      subtree: true,
    });
    window.addEventListener('hashchange', syncActiveSection);
    window.addEventListener('popstate', syncActiveSection);

    return () => {
      observer.disconnect();
      window.removeEventListener('hashchange', syncActiveSection);
      window.removeEventListener('popstate', syncActiveSection);
    };
  }, []);

  useEffect(() => {
    const desktopViewport = window.matchMedia('(min-width: 48rem)');
    const syncDesktopAvailability = () => {
      setCanUseDesktopViewport(desktopViewport.matches);

      if (!desktopViewport.matches) {
        setViewport('mobile');
      }
    };

    syncDesktopAvailability();
    desktopViewport.addEventListener('change', syncDesktopAvailability);

    return () => desktopViewport.removeEventListener('change', syncDesktopAvailability);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setViewport('mobile');
    }
  }, [isOpen]);

  useEffect(() => {
    const screen = screenRef.current;

    if (!screen) {
      return undefined;
    }

    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        if (!targetAvailable) {
          setTargetState('unavailable');
          return;
        }

        setTargetState('available');
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (activeSection === 'style' || activeSection === 'opening') {
          screen.scrollTo({ behavior: reduceMotion ? 'auto' : 'smooth', top: 0 });
          return;
        }

        if (activeSection === 'rsvp') {
          screen.scrollTo({
            behavior: reduceMotion ? 'auto' : 'smooth',
            top: Math.max(0, screen.scrollHeight - screen.clientHeight - 160),
          });
          return;
        }

        const targetId = previewTargetIds[content.templateKey][activeSection];
        const target = targetId ? screen.ownerDocument.getElementById(targetId) : null;

        if (!target || !screen.contains(target)) {
          setTargetState('unavailable');
          return;
        }

        const screenBox = screen.getBoundingClientRect();
        const targetBox = target.getBoundingClientRect();
        const targetTop = Math.max(0, screen.scrollTop + targetBox.top - screenBox.top - 16);

        screen.scrollTo({
          behavior: reduceMotion ? 'auto' : 'smooth',
          top: targetTop,
        });
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [activeSection, content.templateKey, isOpen, targetAvailable, viewport, visibilitySignature]);

  useEffect(() => {
    if (!isOpen) return undefined;

    openerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    scrollPositionRef.current = window.scrollY;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusFrame = window.requestAnimationFrame(() => {
      const overlay = overlayRef.current;
      if (overlay) focusFirstDescendant(overlay, closeButtonRef.current ?? overlay);
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      const overlay = overlayRef.current;
      if (!overlay) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onOpenChangeRef.current(false);
        return;
      }

      trapFocusWithin(event, overlay);
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      window.scrollTo({ top: scrollPositionRef.current });
      openerRef.current?.focus({ preventScroll: true });
      openerRef.current = null;
    };
  }, [isOpen]);

  const status = isDirty ? 'Perubahan lokal · belum disimpan' : 'Draf tersimpan';
  const viewportLabel = viewport === 'desktop' ? 'desktop' : 'ponsel';
  const chapterStatus =
    targetState === 'available'
      ? `Menampilkan bab ${activeChapter.studioLabel} dalam mode ${viewportLabel}.`
      : `Bab ${activeChapter.studioLabel} belum ditampilkan karena bagian ini sedang nonaktif atau belum memiliki isi.`;
  const desktopDeviceClasses =
    viewport === 'desktop'
      ? '!m-0 !h-full !min-h-0 !max-h-none !w-full !max-w-none !flex-1 !basis-auto !rounded-[1rem] !border-[0.22rem] !p-[0.08rem]'
      : '';
  const desktopScreenClasses =
    viewport === 'desktop'
      ? '!rounded-[0.72rem] [&_[data-template=roselle]_[data-roselle-chapter]]:!px-[clamp(1.5rem,8vw,5rem)] [&_[data-template=roselle]_[data-roselle-chapter=opening]]:!min-h-[min(82svh,52rem)] [&_[data-template=roselle]_[data-roselle-chapter=opening]_h1]:!text-[clamp(3.65rem,15vw,7rem)] [&_[data-template=roselle]_[data-roselle-chapter]_h2]:!text-[clamp(2.65rem,8vw,4.4rem)]'
      : '';

  return (
    <aside
      ref={overlayRef}
      aria-describedby="invitation-editor-live-preview-description"
      aria-labelledby="invitation-editor-live-preview-title"
      aria-modal={isOpen || undefined}
      className={
        isOpen
          ? 'bg-seraya-canvas fixed inset-0 z-[60] flex min-h-0 flex-col px-3 py-3 outline-none sm:px-5 sm:py-5'
          : 'sticky top-24 hidden min-w-0 self-start 2xl:block'
      }
      data-local-preview-desktop={!isOpen || undefined}
      data-local-preview-overlay={isOpen || undefined}
      data-preview-active-section={activeSection}
      data-preview-viewport={viewport}
      data-release-b-template-preview="rb3"
      role={isOpen ? 'dialog' : 'complementary'}
      tabIndex={isOpen ? -1 : undefined}
    >
      <div
        className={[
          'border-seraya-border-default bg-seraya-surface flex min-h-0 flex-col overflow-hidden border shadow-[var(--seraya-shadow-float)]',
          isOpen
            ? viewport === 'desktop'
              ? 'mx-auto h-full w-full max-w-[76rem] rounded-[var(--seraya-radius-lg)]'
              : 'mx-auto h-full w-full max-w-[30rem] rounded-[var(--seraya-radius-lg)]'
            : 'max-h-[calc(100vh-7rem)] rounded-[var(--seraya-radius-lg)]',
        ].join(' ')}
      >
        <div className="border-seraya-border-default flex shrink-0 flex-col gap-3 border-b px-4 py-3.5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2
              className="text-seraya-text-primary text-sm font-semibold"
              id="invitation-editor-live-preview-title"
            >
              Pratinjau langsung
            </h2>
            <p
              className="text-seraya-text-muted mt-1 text-xs leading-5"
              id="invitation-editor-live-preview-description"
            >
              Mengikuti perubahan lokal. Belum dipublikasikan dari sini.
            </p>
            <p className="text-seraya-text-secondary mt-1 text-xs leading-5" role="status">
              {chapterStatus}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
            <Badge variant={isDirty ? 'warning' : 'brand'}>{status}</Badge>
            {isOpen ? (
              <div
                aria-label="Ukuran pratinjau"
                className="border-seraya-border-default bg-seraya-canvas inline-flex rounded-[var(--seraya-radius-sm)] border p-1"
                role="group"
              >
                <button
                  aria-pressed={viewport === 'mobile'}
                  className={[
                    'focus-visible:outline-seraya-focus-ring min-h-9 rounded-[calc(var(--seraya-radius-sm)-0.2rem)] px-3 text-xs font-semibold focus-visible:outline-3 focus-visible:outline-offset-2',
                    viewport === 'mobile'
                      ? 'bg-seraya-surface text-seraya-action-primary shadow-sm'
                      : 'text-seraya-text-secondary',
                  ].join(' ')}
                  onClick={() => setViewport('mobile')}
                  type="button"
                >
                  Ponsel
                </button>
                <button
                  aria-pressed={viewport === 'desktop'}
                  className={[
                    'focus-visible:outline-seraya-focus-ring min-h-9 rounded-[calc(var(--seraya-radius-sm)-0.2rem)] px-3 text-xs font-semibold focus-visible:outline-3 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-45',
                    viewport === 'desktop'
                      ? 'bg-seraya-surface text-seraya-action-primary shadow-sm'
                      : 'text-seraya-text-secondary',
                  ].join(' ')}
                  disabled={!canUseDesktopViewport}
                  onClick={() => setViewport('desktop')}
                  title={
                    canUseDesktopViewport
                      ? 'Tampilkan komposisi desktop'
                      : 'Mode desktop tersedia pada layar yang lebih lebar'
                  }
                  type="button"
                >
                  Desktop
                </button>
              </div>
            ) : null}
            <button
              className="border-seraya-border-default text-seraya-text-primary focus-visible:outline-seraya-focus-ring inline-flex min-h-10 items-center justify-center rounded-[var(--seraya-radius-md)] border px-3 text-sm font-semibold focus-visible:outline-3 focus-visible:outline-offset-2"
              onClick={() => onOpenChange(!isOpen)}
              ref={isOpen ? closeButtonRef : undefined}
              type="button"
            >
              {isOpen ? 'Tutup' : 'Perbesar'}
            </button>
          </div>
        </div>

        <div
          className={[styles.deviceShell, desktopDeviceClasses].filter(Boolean).join(' ')}
          data-local-preview-device
        >
          <span
            aria-hidden="true"
            className={viewport === 'desktop' ? 'hidden' : styles.deviceSpeaker}
          />
          <div
            ref={screenRef}
            aria-label="Pratinjau undangan yang dapat digulir"
            className={[styles.deviceScreen, desktopScreenClasses].filter(Boolean).join(' ')}
            data-local-preview-screen
            data-preview-device-mode={viewport}
            role="region"
            tabIndex={0}
          >
            <InvitationTemplateRenderer
              audioPlayback={createInvitationAudioPlaybackCapability({
                configuration: audio,
                requestUrl: `/api/projects/${encodeURIComponent(projectId)}/audio/playback`,
              })}
              invitation={invitation}
              paletteKey={content.paletteKey}
              surface="preview"
              templateKey={content.templateKey}
            />
          </div>
          <span
            aria-hidden="true"
            className={viewport === 'desktop' ? 'hidden' : styles.deviceHomeIndicator}
          />
        </div>
      </div>
    </aside>
  );
});
