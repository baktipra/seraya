'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/cn';

export interface DialogProps {
  children: ReactNode;
  className?: string;
  description?: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
}

/**
 * Controlled dialog primitive. Keep dialog state in the consuming feature so
 * product behavior remains explicit and auditable.
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

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChange(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onOpenChange, open]);

  if (!open || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="presentation"
    >
      <button
        aria-label="Tutup dialog"
        className="bg-seraya-ink/35 absolute inset-0 backdrop-blur-[1px]"
        onClick={() => onOpenChange(false)}
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
            className="text-seraya-text-secondary hover:bg-seraya-soft hover:text-seraya-text-primary focus-visible:outline-seraya-focus-ring inline-flex size-10 shrink-0 items-center justify-center rounded-full text-lg transition-colors focus-visible:outline-3 focus-visible:outline-offset-2"
            onClick={() => onOpenChange(false)}
            type="button"
          >
            ×
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
