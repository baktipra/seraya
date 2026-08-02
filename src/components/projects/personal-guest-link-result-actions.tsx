'use client';

import { Button, Input } from '@/design-system';

type PersonalGuestLinkResultActionsProps = {
  copyFeedback: string | null;
  guestDisplayName: string;
  onClose: () => void;
  onCopy: () => void;
  personalUrl: string;
  recipientWhatsAppPhoneE164?: string | null;
};

const linkActionClassName =
  'border-seraya-border-default bg-seraya-surface text-seraya-text-primary hover:bg-seraya-soft focus-visible:outline-seraya-focus-ring inline-flex min-h-11 items-center justify-center rounded-[var(--seraya-radius-sm)] border px-4 text-sm font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2';

/**
 * Rendered only after an explicit owner-authorized create, replace, or re-access
 * command. The raw URL never comes from a guest-list DTO and is not persisted by
 * this component.
 */
export function PersonalGuestLinkResultActions(props: PersonalGuestLinkResultActionsProps) {
  const {
    copyFeedback,
    guestDisplayName,
    onClose,
    onCopy,
    personalUrl,
    recipientWhatsAppPhoneE164,
  } = props;
  const whatsappNumber = recipientWhatsAppPhoneE164?.replace(/\D/g, '') ?? '';
  const whatsappMessage = encodeURIComponent(
    `Halo ${guestDisplayName}, berikut Undangan Pribadi dari kami: ${personalUrl}`,
  );
  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`
    : null;

  return (
    <div className="space-y-5">
      <Input aria-label="Tautan pribadi" readOnly value={personalUrl} />
      <p aria-live="polite" className="text-seraya-text-muted text-sm leading-6">
        {copyFeedback ??
          'URL ini ditampilkan hanya setelah tindakan owner. Membuka atau membagikannya tidak membuat status kirim, dibaca, atau dibuka.'}
      </p>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
        <Button onClick={onClose} type="button" variant="secondary">
          Selesai
        </Button>
        <a className={linkActionClassName} href={personalUrl} rel="noreferrer" target="_blank">
          Buka tautan
        </a>
        <Button onClick={onCopy} type="button">
          Salin tautan
        </Button>
        {whatsappUrl ? (
          <a className={linkActionClassName} href={whatsappUrl} rel="noreferrer" target="_blank">
            Buka WhatsApp
          </a>
        ) : null}
      </div>
    </div>
  );
}
