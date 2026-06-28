export type DeliveryLinkActionState = {
  message?: string;
  personalUrl?: string;
  recipientWhatsAppPhoneE164?: string | null;
  status: 'idle' | 'error' | 'success';
};

export const initialDeliveryLinkActionState: DeliveryLinkActionState = { status: 'idle' };

/** Batch state intentionally exposes aggregate counts only, never raw capability material. */
export type DeliveryBatchActionState = {
  createdCount?: number;
  failedCount?: number;
  failedEncryptionCount?: number;
  failedUnexpectedCount?: number;
  message?: string;
  requestedGuestCount?: number;
  skippedActiveLinkCount?: number;
  skippedInactiveGuestCount?: number;
  skippedInvalidProjectCount?: number;
  status: 'idle' | 'error' | 'partial' | 'success';
  whatsappMissingCreatedCount?: number;
};

export const initialDeliveryBatchActionState: DeliveryBatchActionState = { status: 'idle' };

/** Explicit owner clipboard action; phone values are not persisted in list DTOs or exports. */
export type DeliveryWhatsAppClipboardActionState = {
  message?: string;
  numbersText?: string;
  status: 'idle' | 'error' | 'success';
};

export const initialDeliveryWhatsAppClipboardActionState: DeliveryWhatsAppClipboardActionState = {
  status: 'idle',
};
