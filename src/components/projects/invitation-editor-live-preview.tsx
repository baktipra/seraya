'use client';

import { useEffect, useMemo, useRef } from 'react';

import { Badge } from '@/design-system';
import { InvitationTemplateRenderer } from '@/modules/invitation-templates';
import type { InvitationRendererProjectMetadata } from '@/modules/invitation-templates/invitation-view-model';
import { createInvitationEditorPreviewViewModel } from '@/modules/invitations/invitation-editor-local-state';
import type { InvitationDraftContent } from '@/modules/invitations/invitation-draft.schema';
import type { InvitationGalleryImage } from '@/modules/media/media.types';

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
    () => createInvitationEditorPreviewViewModel({ content, galleryImages, project }),
    [content, galleryImages, project],
  );

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
    <aside
      aria-labelledby="invitation-editor-live-preview-title"
      aria-modal={isOpen || undefined}
      className={[
        isOpen
          ? 'bg-seraya-canvas fixed inset-0 z-[60] flex min-h-0 flex-col px-3 py-3 sm:px-5 sm:py-5'
          : 'sticky top-24 hidden self-start 2xl:block',
      ].join(' ')}
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
              Pratinjau lokal
            </p>
            <p className="text-seraya-text-muted mt-1 text-xs leading-5">
              Diperbarui langsung dari editor. Belum dipublikasikan dari sini.
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

        <div
          className={`${styles.device} bg-seraya-soft min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 sm:p-3`}
          data-local-preview-device
          tabIndex={0}
        >
          <InvitationTemplateRenderer
            invitation={invitation}
            surface="preview"
            templateKey={content.templateKey}
          />
        </div>
      </div>
    </aside>
  );
}
