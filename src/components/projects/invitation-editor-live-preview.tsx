'use client';

import { useEffect, useMemo, useRef } from 'react';

import { Badge } from '@/design-system';
import { focusFirstDescendant, trapFocusWithin } from '@/lib/focus-management';
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
  const overlayRef = useRef<HTMLElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const onOpenChangeRef = useRef(onOpenChange);
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
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

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
      role={isOpen ? 'dialog' : 'complementary'}
      tabIndex={isOpen ? -1 : undefined}
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
            aria-label="Pratinjau undangan yang dapat digulir"
            className={styles.deviceScreen}
            data-local-preview-screen
            role="region"
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
  );
}
