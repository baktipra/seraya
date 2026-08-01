'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';

import { Badge } from '@/design-system';
import { focusFirstDescendant, trapFocusWithin } from '@/lib/focus-management';
import { InvitationTemplateRenderer } from '@/modules/invitation-templates';
import type { InvitationRendererProjectMetadata } from '@/modules/invitation-templates/invitation-view-model';
import { createInvitationEditorPreviewViewModel } from '@/modules/invitations/invitation-editor-local-state';
import type { InvitationDraftContent } from '@/modules/invitations/invitation-draft.schema';
import type { InvitationGalleryImage } from '@/modules/media/media.types';

import { useInvitationEditorContextualSaveAction } from './invitation-editor-contextual-actions';
import {
  invitationEditorSections,
  type InvitationEditorSectionKey,
} from './invitation-editor-workspace';
import styles from './invitation-editor-live-preview.module.css';

type InvitationPreviewViewport = 'desktop' | 'mobile';

type InvitationPreviewTargetState = 'available' | 'unavailable';

const previewTargetSelectors: Record<InvitationEditorSectionKey, readonly string[]> = {
  style: [
    '[data-invitation-chapter="opening"]',
    '[data-roselle-chapter="opening"]',
  ],
  opening: [
    '[data-invitation-chapter="opening"]',
    '[data-roselle-chapter="opening"]',
  ],
  couple: [
    '[data-invitation-chapter="couple"]',
    '[data-roselle-chapter="couple"]',
  ],
  story: [
    '[data-invitation-chapter="story"]',
    '[data-roselle-chapter="story"]',
  ],
  schedule: [
    '[data-invitation-chapter="schedule"]',
    '[data-roselle-chapter="events"]',
    '[data-invitation-schedule-journey]',
  ],
  gallery: [
    '[data-invitation-chapter="gallery"]',
    '[data-roselle-chapter="gallery"]',
  ],
  gift: [
    '[data-invitation-chapter="gift"]',
    '[data-roselle-chapter="gift"]',
  ],
  rsvp: ['[data-template-response-journey]', '[data-generic-response-note]'],
  closing: [
    '[data-invitation-chapter="closing"]',
    '[data-roselle-chapter="closing"]',
  ],
};

const templateAwarePreviewStyles = `
  [data-release-b-template-preview='rb3'][data-preview-viewport='mobile']
    [data-template='aruna'] [data-invitation-chapter='opening'] {
    grid-template-columns: 1fr;
    min-height: 0;
    padding: 4rem 1.35rem;
  }

  [data-release-b-template-preview='rb3'][data-preview-viewport='mobile']
    [data-template='aruna'] [data-invitation-chapter='opening'] > div:last-child {
    min-width: 0;
    padding: 1rem 0 0;
    border-top: 1px solid currentcolor;
    border-left: 0;
  }

  [data-release-b-template-preview='rb3'][data-preview-viewport='mobile']
    [data-template='aruna'] [data-invitation-chapter='couple'] > div:last-child,
  [data-release-b-template-preview='rb3'][data-preview-viewport='mobile']
    [data-template='aruna'] [data-invitation-chapter='schedule'] > div:last-child,
  [data-release-b-template-preview='rb3'][data-preview-viewport='mobile']
    [data-template='laras'] [data-invitation-chapter='couple'] > div:last-child,
  [data-release-b-template-preview='rb3'][data-preview-viewport='mobile']
    [data-template='laras'] [data-invitation-chapter='schedule'] > div:last-child {
    grid-template-columns: 1fr;
  }

  [data-release-b-template-preview='rb3'][data-preview-viewport='mobile']
    [data-template='aruna'] [data-invitation-chapter='couple'] article:last-child {
    text-align: left;
  }

  [data-release-b-template-preview='rb3'][data-preview-viewport='mobile']
    [data-template='aruna'] [data-invitation-chapter='couple'] > div:last-child > span,
  [data-release-b-template-preview='rb3'][data-preview-viewport='mobile']
    [data-template='laras'] [data-invitation-chapter='couple'] > div:last-child > span {
    justify-self: center;
  }

  [data-release-b-template-preview='rb3'][data-preview-viewport='mobile']
    [data-template='aruna'] [data-invitation-chapter='gallery'] > div:last-child,
  [data-release-b-template-preview='rb3'][data-preview-viewport='mobile']
    [data-template='laras'] [data-invitation-chapter='gallery'] > div:last-child {
    grid-template-columns: 1fr;
  }

  [data-release-b-template-preview='rb3'][data-preview-viewport='mobile']
    [data-template='aruna'] [data-invitation-chapter='gallery'] figure,
  [data-release-b-template-preview='rb3'][data-preview-viewport='mobile']
    [data-template='laras'] [data-invitation-chapter='gallery'] figure {
    grid-column: auto;
    transform: none;
  }

  [data-release-b-template-preview='rb3'][data-preview-viewport='desktop']
    [data-template='roselle'] [data-roselle-chapter='opening'] {
    min-height: min(82svh, 52rem);
    padding: clamp(4.75rem, 14vw, 7.5rem) clamp(1.5rem, 8vw, 5rem)
      clamp(5.5rem, 14vw, 7rem);
  }

  [data-release-b-template-preview='rb3'][data-preview-viewport='desktop']
    [data-template='roselle'] [data-roselle-chapter='opening'] h1 {
    font-size: clamp(3.65rem, 15vw, 7rem);
  }

  [data-release-b-template-preview='rb3'][data-preview-viewport='desktop']
    [data-template='roselle'] [data-roselle-chapter] {
    padding-right: clamp(1.5rem, 8vw, 5rem);
    padding-left: clamp(1.5rem, 8vw, 5rem);
  }

  [data-release-b-template-preview='rb3'][data-preview-viewport='desktop']
    [data-template='roselle'] [data-roselle-chapter] h2 {
    font-size: clamp(2.65rem, 8vw, 4.4rem);
  }

  [data-release-b-template-preview='rb3'][data-preview-viewport='desktop']
    [data-template='roselle'] [data-roselle-chapter='couple'] > div {
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  }
`;

function isInvitationEditorSectionKey(value: string): value is InvitationEditorSectionKey {
  return invitationEditorSections.some((section) => section.key === value);
}

function findPreviewTarget(
  screen: HTMLElement,
  activeSection: InvitationEditorSectionKey,
): HTMLElement | null {
  for (const selector of previewTargetSelectors[activeSection]) {
    const target = screen.querySelector<HTMLElement>(selector);

    if (target) {
      return target;
    }
  }

  return null;
}

export type InvitationEditorLivePreviewProps = {
  content: InvitationDraftContent;
  galleryImages: InvitationGalleryImage[];
  isDirty: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  project: InvitationRendererProjectMetadata;
};

export const InvitationEditorLivePreview = memo(function InvitationEditorLivePreview({
  content,
  galleryImages,
  isDirty,
  isOpen,
  onOpenChange,
  project,
}: InvitationEditorLivePreviewProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const overlayRef = useRef<HTMLElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const onOpenChangeRef = useRef(onOpenChange);
  const screenRef = useRef<HTMLDivElement | null>(null);
  const scrollPositionRef = useRef(0);
  const [activeSection, setActiveSection] = useState<InvitationEditorSectionKey>('style');
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
  const visibilitySignature = [
    content.templateKey,
    content.story.enabled,
    content.eventSchedule.events.length,
    content.gallery.enabled,
    content.gallery.imageIds.length,
    content.digitalGift.enabled,
    content.rsvp.enabled,
    content.closing.enabled,
  ].join(':');

  useInvitationEditorContextualSaveAction(isDirty);

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  useEffect(() => {
    const syncActiveSection = () => {
      const currentChapter = document.querySelector<HTMLElement>(
        '[data-invitation-editor-chapter][aria-current="step"]',
      );
      const requestedSection = currentChapter?.dataset.invitationEditorChapter;

      if (requestedSection && isInvitationEditorSectionKey(requestedSection)) {
        setActiveSection(requestedSection);
      }
    };

    syncActiveSection();

    const editorRoot = document.querySelector<HTMLElement>(
      '[data-invitation-editor-runtime-ready]',
    );

    if (!editorRoot) {
      return undefined;
    }

    const observer = new MutationObserver(syncActiveSection);
    observer.observe(editorRoot, {
      attributeFilter: ['aria-current'],
      attributes: true,
      subtree: true,
    });

    return () => observer.disconnect();
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
        const target = findPreviewTarget(screen, activeSection);
        setTargetState(target ? 'available' : 'unavailable');

        if (!target) {
          return;
        }

        const screenBox = screen.getBoundingClientRect();
        const targetBox = target.getBoundingClientRect();
        const targetTop = Math.max(0, screen.scrollTop + targetBox.top - screenBox.top - 16);
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
  }, [activeSection, isOpen, viewport, visibilitySignature]);

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
  const chapterStatus =
    targetState === 'available'
      ? `Menampilkan bab ${activeChapter.studioLabel}.`
      : `Bab ${activeChapter.studioLabel} belum ditampilkan karena bagian ini sedang nonaktif atau belum memiliki isi.`;

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

        <style>{templateAwarePreviewStyles}</style>
        <div
          className={styles.deviceShell}
          data-local-preview-device
          style={
            viewport === 'desktop'
              ? {
                  aspectRatio: 'auto',
                  borderRadius: '1rem',
                  borderWidth: '0.22rem',
                  flex: '1 1 auto',
                  height: '100%',
                  margin: 0,
                  maxHeight: 'none',
                  minHeight: 0,
                  padding: '0.08rem',
                  width: '100%',
                }
              : undefined
          }
        >
          <span
            aria-hidden="true"
            className={viewport === 'desktop' ? 'hidden' : styles.deviceSpeaker}
          />
          <div
            ref={screenRef}
            aria-label={`Pratinjau undangan ${viewport === 'desktop' ? 'desktop' : 'ponsel'} yang dapat digulir`}
            className={styles.deviceScreen}
            data-local-preview-screen
            role="region"
            style={viewport === 'desktop' ? { borderRadius: '0.72rem' } : undefined}
            tabIndex={0}
          >
            <InvitationTemplateRenderer
              invitation={invitation}
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
