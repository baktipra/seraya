'use client';

import { useState } from 'react';

import { Button, Dialog } from '@/design-system';
import type { GuestFollowUpHandoffResult } from '@/modules/follow-up/follow-up.types';

const messageKindLabels = {
  event_reminder: 'Pengingat acara',
  initial_invitation: 'Undangan awal',
  rsvp_reminder: 'Pengingat RSVP',
} as const;

function safeCopy(text: string) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }

  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.setAttribute('readonly', '');
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';
  document.body.appendChild(textArea);
  textArea.select();
  const didCopy = document.execCommand('copy');
  textArea.remove();
  return didCopy ? Promise.resolve() : Promise.reject(new Error('Clipboard unavailable'));
}

function formatPreparedAt(value: string, timezone: string) {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: timezone,
    }).format(new Date(value));
  } catch {
    return 'Baru saja';
  }
}

type GuestFollowUpResultDialogProps = {
  onClose: () => void;
  result: GuestFollowUpHandoffResult | null;
  timezone: string;
};

export function GuestFollowUpResultDialog({
  onClose,
  result,
  timezone,
}: GuestFollowUpResultDialogProps) {
  const [feedback, setFeedback] = useState<string | null>(null);

  async function copyValue(value: string, successMessage: string) {
    try {
      await safeCopy(value);
      setFeedback(successMessage);
    } catch {
      setFeedback('Clipboard tidak tersedia. Salin isi secara manual.');
    }
  }

  function closeDialog() {
    setFeedback(null);
    onClose();
  }

  return (
    <Dialog
      className="max-w-2xl"
      description="Seraya baru menyiapkan handoff. Pesan belum dianggap terkirim sampai Anda melanjutkannya sendiri di WhatsApp."
      onOpenChange={(open) => !open && closeDialog()}
      open={Boolean(result)}
      title="Lanjutkan pengiriman manual"
    >
      {result ? (
        <div className="space-y-5">
          <div className="bg-seraya-status-success-soft rounded-[var(--seraya-radius-md)] px-4 py-3">
            <p className="text-seraya-status-success text-sm font-semibold">
              Handoff WhatsApp disiapkan
            </p>
            <p className="text-seraya-text-secondary mt-1 text-xs leading-5">
              {messageKindLabels[result.messageKind]} ·{' '}
              {formatPreparedAt(result.preparedAt, timezone)}
            </p>
          </div>

          <div className="space-y-2">
            <label
              className="text-seraya-text-primary text-sm font-semibold"
              htmlFor="follow-up-message-preview"
            >
              Pesan yang akan dibuka di WhatsApp
            </label>
            <textarea
              className="border-seraya-border-default bg-seraya-canvas text-seraya-text-primary min-h-56 w-full resize-y rounded-[var(--seraya-radius-md)] border px-3.5 py-3 text-sm leading-6 outline-none"
              id="follow-up-message-preview"
              readOnly
              value={result.messageText}
            />
          </div>

          <p aria-live="polite" className="text-seraya-text-secondary min-h-5 text-sm">
            {feedback}
          </p>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <Button onClick={closeDialog} type="button" variant="text">
              Tutup
            </Button>
            <Button
              onClick={() => void copyValue(result.personalUrl, 'Tautan undangan disalin.')}
              type="button"
              variant="secondary"
            >
              Copy tautan
            </Button>
            <Button
              onClick={() => void copyValue(result.messageText, 'Pesan disalin.')}
              type="button"
              variant="secondary"
            >
              Copy pesan
            </Button>
            <a
              className="bg-seraya-action-primary text-seraya-text-inverse hover:bg-seraya-action-primary-hover focus-visible:outline-seraya-focus-ring inline-flex min-h-11 items-center justify-center rounded-[var(--seraya-radius-md)] px-4 text-sm font-semibold shadow-[0_8px_18px_rgb(142_75_82_/_0.16)] transition-colors focus-visible:outline-3 focus-visible:outline-offset-2"
              href={result.whatsappComposeUrl}
              onClick={() => setFeedback('WhatsApp dibuka. Pengiriman tetap dilakukan manual.')}
              rel="noopener noreferrer"
              target="_blank"
            >
              Buka WhatsApp
            </a>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}
