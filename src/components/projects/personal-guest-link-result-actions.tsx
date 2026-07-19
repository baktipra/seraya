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

/**
 * This component is rendered only inside the existing immediate one-time
 * personal-link result surface. The raw URL never comes from a guest-list DTO
 * and is not persisted by this component.
 */
export function PersonalGuestLinkResultActions(props: PersonalGuestLinkResultActionsProps) {
  const { copyFeedback, onClose, onCopy, personalUrl } = props;
  return (
    <div className="space-y-5">
      <Input aria-label="Tautan pribadi" readOnly value={personalUrl} />
      <p aria-live="polite" className="text-seraya-text-muted text-sm leading-6">
        {copyFeedback ??
          'Copy tautan bila perlu. Tutup dialog lalu gunakan WhatsApp pada row tamu untuk mencatat handoff awal.'}
      </p>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button onClick={onClose} type="button" variant="secondary">
          Selesai
        </Button>
        <Button onClick={onCopy} type="button" variant="secondary">
          Salin tautan
        </Button>
      </div>
    </div>
  );
}
