export type DeliveryLinkActionState = {
  message?: string;
  personalUrl?: string;
  recipientWhatsAppPhoneE164?: string | null;
  resultKey?: string;
  status: 'idle' | 'error' | 'success';
  /** Temporary exact compose URL returned only by an authorized manual handoff action. */
  whatsappComposeUrl?: string;
};

export const initialDeliveryLinkActionState: DeliveryLinkActionState = { status: 'idle' };

export type DeliveryContactActionState = {
  message?: string;
  resultKey?: string;
  status: 'idle' | 'error' | 'success';
};

export const initialDeliveryContactActionState: DeliveryContactActionState = { status: 'idle' };

/** Batch state exposes aggregate counts only, never capability material. */
export type DeliveryBatchActionState = {
  createdCount?: number;
  failedCount?: number;
  failedEncryptionCount?: number;
  failedUnexpectedCount?: number;
  replacedExpiredLinkCount?: number;
  replacedRevokedLinkCount?: number;
  message?: string;
  requestedGuestCount?: number;
  skippedActiveLinkCount?: number;
  skippedInactiveGuestCount?: number;
  skippedInvalidProjectCount?: number;
  status: 'idle' | 'error' | 'partial' | 'success';
  whatsappMissingCreatedCount?: number;
};

export const initialDeliveryBatchActionState: DeliveryBatchActionState = { status: 'idle' };

export type DeliveryWhatsAppClipboardActionState = {
  message?: string;
  numbersText?: string;
  status: 'idle' | 'error' | 'success';
};

export const initialDeliveryWhatsAppClipboardActionState: DeliveryWhatsAppClipboardActionState = {
  status: 'idle',
};
