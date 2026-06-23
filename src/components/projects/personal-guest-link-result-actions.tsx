'use client';

import { Button, Input } from '@/design-system';
import { buildWhatsAppGuestInviteShareUrl } from '@/modules/guest-links/whatsapp-share';

type PersonalGuestLinkResultActionsProps = {
  copyFeedback: string | null;
  guestDisplayName: string;
  onClose: () => void;
  onCopy: () => void;
  personalUrl: string;
};

/**
 * This component is rendered only inside the existing immediate one-time
 * personal-link result surface. The raw URL never comes from a guest-list DTO
 * and is not persisted by this component.
 */
export function PersonalGuestLinkResultActions({
  copyFeedback,
  guestDisplayName,
  onClose,
  onCopy,
  personalUrl,
}: PersonalGuestLinkResultActionsProps) {
  let whatsappShareUrl: string | null = null;

  try {
    whatsappShareUrl = buildWhatsAppGuestInviteShareUrl({
      guestDisplayName,
      personalGuestUrl: personalUrl,
    });
  } catch {
    // The existing controlled server action only returns a configured HTTPS
    // personal URL. Keep copy as the safe fallback if that invariant is ever
    // unavailable at render time.
    whatsappShareUrl = null;
  }

  return (
    <div className="space-y-5">
      <Input aria-label="Tautan pribadi" readOnly value={personalUrl} />
      <p aria-live="polite" className="text-seraya-text-muted text-sm leading-6">
        {copyFeedback ?? 'Bagikan hanya kepada tamu yang dituju.'}
      </p>
      {whatsappShareUrl ? (
        <p className="text-seraya-text-secondary text-sm leading-6">
          WhatsApp akan dibuka agar Anda dapat memilih penerima dan mengirim pesan sendiri.
        </p>
      ) : null}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button onClick={onClose} type="button" variant="secondary">
          Selesai
        </Button>
        <Button onClick={onCopy} type="button" variant="secondary">
          Salin tautan
        </Button>
        {whatsappShareUrl ? (
          <a
            aria-label="Bagikan tautan pribadi lewat WhatsApp"
            className="bg-seraya-action-primary text-seraya-text-inverse hover:bg-seraya-action-primary-hover focus-visible:outline-seraya-focus-ring inline-flex min-h-11 items-center justify-center rounded-[var(--seraya-radius-md)] px-4 text-sm font-semibold shadow-[0_8px_18px_rgb(142_75_82_/_0.16)] transition-colors duration-200 focus-visible:outline-3 focus-visible:outline-offset-2"
            href={whatsappShareUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            Bagikan lewat WhatsApp
          </a>
        ) : null}
      </div>
    </div>
  );
}
