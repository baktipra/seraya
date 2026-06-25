'use client';

import { useEffect, useId, useRef, useState } from 'react';

import { cn } from '@/lib/cn';

type CopyFeedback = 'idle' | 'success' | 'unavailable';

type DigitalGiftCopyButtonProps = {
  accountNumber: string;
  className?: string;
  feedbackClassName?: string;
};

async function copyAccountNumber(accountNumber: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(accountNumber);
      return true;
    } catch {
      // Some embedded or permission-restricted browsers expose the API but
      // reject writes. Continue to the browser-compatible fallback below.
    }
  }

  if (typeof document === 'undefined') {
    return false;
  }

  const textarea = document.createElement('textarea');
  textarea.value = accountNumber;
  textarea.setAttribute('aria-hidden', 'true');
  textarea.setAttribute('readonly', '');
  textarea.style.left = '-9999px';
  textarea.style.position = 'fixed';
  textarea.style.top = '0';

  document.body.append(textarea);
  textarea.focus();
  textarea.select();

  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}

/**
 * Client-only local clipboard control. It receives the already rendered public
 * account number and never fetches, stores, or reports any recipient data.
 */
export function DigitalGiftCopyButton({
  accountNumber,
  className,
  feedbackClassName,
}: DigitalGiftCopyButtonProps) {
  const feedbackId = useId();
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [feedback, setFeedback] = useState<CopyFeedback>('idle');

  useEffect(() => {
    return () => {
      if (feedbackTimer.current) {
        clearTimeout(feedbackTimer.current);
      }
    };
  }, []);

  async function handleCopy() {
    const copied = await copyAccountNumber(accountNumber);
    setFeedback(copied ? 'success' : 'unavailable');

    if (feedbackTimer.current) {
      clearTimeout(feedbackTimer.current);
    }

    feedbackTimer.current = setTimeout(() => setFeedback('idle'), 2600);
  }

  const feedbackMessage =
    feedback === 'success'
      ? 'Nomor berhasil disalin.'
      : feedback === 'unavailable'
        ? 'Nomor belum bisa disalin. Silakan salin secara manual.'
        : '';

  return (
    <div className="space-y-2">
      <button
        aria-describedby={feedbackMessage ? feedbackId : undefined}
        className={cn(
          'focus-visible:outline-seraya-focus-ring inline-flex min-h-10 items-center justify-center rounded-[var(--seraya-radius-sm)] px-3.5 text-sm font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-3',
          className,
        )}
        onClick={handleCopy}
        type="button"
      >
        Salin nomor
      </button>
      <p
        aria-live="polite"
        className={cn('min-h-5 text-sm leading-5', feedbackClassName)}
        id={feedbackId}
        role="status"
      >
        {feedbackMessage}
      </p>
    </div>
  );
}
