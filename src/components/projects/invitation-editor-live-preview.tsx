'use client';

import { useEffect, useMemo, useRef } from 'react';

import { Badge } from '@/design-system';
import { InvitationTemplateRenderer } from '@/modules/invitation-templates';
import type { InvitationRendererProjectMetadata } from '@/modules/invitation-templates/invitation-view-model';
import { createInvitationEditorPreviewViewModel } from '@/modules/invitations/invitation-editor-local-state';
import type { InvitationDraftContent } from '@/modules/invitations/invitation-draft.schema';
import type { InvitationGalleryImage } from '@/modules/media/media.types';

import { useInvitationEditorContextualSaveAction } from './invitation-editor-contextual-actions';
import styles from './invitation-editor-live-preview.module.css';

export type InvitationEditorLivePreviewProps = {
  content: InvitationDraftContent;
  galleryImages: InvitationGalleryImage[];
  isDirty: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  project: InvitationRendererProjectMetadata;
};

export function InvitationEditorLivePreview({
  content,
  galleryImages,
  isDirty,
  isOpen,
  onOpenChange,
  project,
}: InvitationEditorLivePreviewProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const scrollPositionRef = useRef(0);
  const invitation = useMemo(
    () =>
      createInvitationEditorPreviewViewModel({
        content,
        galleryImages,
        project,
      }),
    [content, galleryImages, project],
  );

  useInvitationEditorContextualSaveAction(isDirty);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    scrollPositionRef.current = window.scrollY;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChange(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      window.scrollTo({ top: scrollPositionRef.current });
      document
        .querySelector<HTMLButtonElement>('[data-local-preview-trigger]')
        ?.focus({ preventScroll: true });
    };
  }, [isOpen, onOpenChange]);

  const status = isDirty ? 'Perubahan lokal · belum disimpan' : 'Draf tersimpan';

  return (
    <>
      <aside
        aria-labelledby="invitation-editor-live-preview-title"
        aria-modal={isOpen || undefined}
        className={
          isOpen
            ? 'bg-seraya-canvas fixed inset-0 z-[60] flex min-h-0 flex-col px-3 py-3 sm:px-5 sm:py-5'
            : 'sticky top-24 hidden self-start 2xl:block'
        }
        data-local-preview-desktop={!isOpen || undefined}
        data-local-preview-overlay={isOpen || undefined}
        role={isOpen ? 'dialog' : 'complementary'}
      >
        <div
          className={[
            'border-seraya-border-default bg-seraya-surface flex min-h-0 flex-col overflow-hidden border shadow-[var(--seraya-shadow-float)]',
            isOpen
              ? 'mx-auto h-full w-full max-w-[30rem] rounded-[var(--seraya-radius-lg)]'
              : 'max-h-[calc(100vh-7rem)] rounded-[var(--seraya-radius-lg)]',
          ].join(' ')}
        >
          <div className="border-seraya-border-default flex shrink-0 items-start justify-between gap-3 border-b px-4 py-3.5">
            <div className="min-w-0">
              <p
                className="text-seraya-text-primary text-sm font-semibold"
                id="invitation-editor-live-preview-title"
              >
                Pratinjau langsung
              </p>
              <p className="text-seraya-text-muted mt-1 text-xs leading-5">
                Mengikuti perubahan lokal. Belum dipublikasikan dari sini.
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <Badge variant={isDirty ? 'warning' : 'brand'}>{status}</Badge>
              {isOpen ? (
                <button
                  className="border-seraya-border-default text-seraya-text-primary focus-visible:outline-seraya-focus-ring inline-flex min-h-11 items-center justify-center rounded-[var(--seraya-radius-md)] border px-3 text-sm font-semibold focus-visible:outline-3 focus-visible:outline-offset-2"
                  onClick={() => onOpenChange(false)}
                  ref={closeButtonRef}
                  type="button"
                >
                  Tutup
                </button>
              ) : null}
            </div>
          </div>

          <div className={styles.deviceShell} data-local-preview-device>
            <span aria-hidden="true" className={styles.deviceSpeaker} />
            <div
              className={styles.deviceScreen}
              data-local-preview-screen
              tabIndex={0}
            >
              <InvitationTemplateRenderer
                invitation={invitation}
                surface="preview"
                templateKey={content.templateKey}
              />
            </div>
            <span aria-hidden="true" className={styles.deviceHomeIndicator} />
          </div>
        </div>
      </aside>

      <style>{`
        @media (min-width: 1024px) {
          [data-invitation-studio] [data-invitation-editor-panel],
          [data-invitation-studio] [data-invitation-editor-desktop-navigation] {
            scrollbar-width: none !important;
            -ms-overflow-style: none;
          }

          [data-invitation-studio] [data-invitation-editor-panel]::-webkit-scrollbar,
          [data-invitation-studio] [data-invitation-editor-desktop-navigation]::-webkit-scrollbar {
            display: none;
            width: 0;
            height: 0;
          }

          [data-invitation-studio]
            form
            > div:has([data-testid='invitation-editor-save-status']) {
            min-height: 4.4rem !important;
            border-width: 1px 0 0 !important;
            border-radius: 0 !important;
            background: transparent !important;
            padding: 0.55rem 0.75rem !important;
            box-shadow: none !important;
            backdrop-filter: none !important;
          }

          [data-invitation-studio]
            form
            > div:has([data-testid='invitation-editor-save-status'])
            > div {
            align-items: center !important;
          }

          [data-invitation-studio]
            form
            > div:has([data-testid='invitation-editor-save-status'])
            > div
            > div:last-child {
            grid-template-rows: 2.45rem 0.8rem !important;
            align-items: stretch !important;
          }

          [data-invitation-studio]
            form
            > div:has([data-testid='invitation-editor-save-status'])
            button,
          [data-invitation-studio]
            form
            > div:has([data-testid='invitation-editor-save-status'])
            a[href$='/preview'] {
            height: 2.45rem !important;
            min-height: 2.45rem !important;
            align-self: stretch !important;
          }
        }

        @media (min-width: 1440px) {
          [data-invitation-studio]
            aside[data-local-preview-desktop]:not([data-local-preview-overlay])
            > div {
            padding-bottom: 0.65rem !important;
          }

          [data-invitation-studio]
            aside[data-local-preview-desktop]:not([data-local-preview-overlay])
            [data-local-preview-device] {
            box-sizing: border-box !important;
            flex: 0 1 auto !important;
            width: auto !important;
            height: min(calc(100% - 3.5rem), 34rem) !important;
            min-height: 28rem !important;
            max-height: 34rem !important;
            aspect-ratio: 9 / 19.5;
            margin: 0.7rem auto 0.8rem !important;
            overflow: hidden !important;
            border: 0.32rem solid #3a3431 !important;
            border-radius: 1.7rem !important;
            outline: 1px solid rgb(255 255 255 / 0.12) !important;
            background: #3a3431 !important;
            padding: 0.1rem !important;
            box-shadow:
              0 18px 38px rgb(55 41 34 / 0.14),
              0 3px 8px rgb(55 41 34 / 0.09) !important;
            scrollbar-width: none !important;
          }

          [data-invitation-studio]
            aside[data-local-preview-desktop]:not([data-local-preview-overlay])
            [data-local-preview-screen] {
            border-radius: 1.34rem !important;
          }

          [data-invitation-studio]
            aside[data-local-preview-desktop]:not([data-local-preview-overlay])
            [data-local-preview-screen]
            [data-template] {
            border-radius: 1.25rem !important;
          }
        }
      `}</style>
    </>
  );
}
