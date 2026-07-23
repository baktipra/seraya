'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/cn';
import { focusFirstDescendant, trapFocusWithin } from '@/lib/focus-management';

export interface DialogProps {
  children: ReactNode;
  className?: string;
  description?: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
}

/**
 * Controlled dialog primitive. Focus remains trapped while open and returns to
 * the element that opened the dialog after the surface has unmounted.
 */
export function Dialog({
  children,
  className,
  description,
  onOpenChange,
  open,
  title,
}: DialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onOpenChangeRef = useRef(onOpenChange);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) return undefined;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusFrame = window.requestAnimationFrame(() => {
      if (dialogRef.current) focusFirstDescendant(dialogRef.current);
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      const dialog = dialogRef.current;
      if (!dialog) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onOpenChangeRef.current(false);
        return;
      }

      trapFocusWithin(event, dialog);
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);

      const previousFocus = previousFocusRef.current;
      previousFocusRef.current = null;
      window.requestAnimationFrame(() => {
        const anotherModalIsOpen = document.querySelector('[role="dialog"][aria-modal="true"]');
        if (!anotherModalIsOpen && previousFocus?.isConnected) {
          previousFocus.focus({ preventScroll: true });
        }
      });
    };
  }, [open]);

  if (!open || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="presentation"
    >
      <button
        aria-hidden="true"
        className="bg-seraya-ink/35 absolute inset-0 backdrop-blur-[1px]"
        onClick={() => onOpenChange(false)}
        tabIndex={-1}
        type="button"
      />
      <div
        ref={dialogRef}
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className={cn(
          'border-seraya-border-default bg-seraya-surface relative z-10 w-full max-w-lg rounded-[var(--seraya-radius-xl)] border p-5 shadow-[var(--seraya-shadow-modal)] outline-none sm:p-6',
          className,
        )}
        data-dialog-surface
        role="dialog"
        tabIndex={-1}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id={titleId}
              className="text-seraya-text-primary font-serif text-2xl leading-tight tracking-[-0.02em]"
            >
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="text-seraya-text-secondary mt-2 text-sm leading-6">
                {description}
              </p>
            ) : null}
          </div>
          <button
            aria-label="Tutup dialog"
            className="text-seraya-text-secondary hover:bg-seraya-soft hover:text-seraya-text-primary focus-visible:outline-seraya-focus-ring inline-flex size-11 shrink-0 items-center justify-center rounded-full text-lg transition-colors focus-visible:outline-3 focus-visible:outline-offset-2"
            onClick={() => onOpenChange(false)}
            type="button"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
