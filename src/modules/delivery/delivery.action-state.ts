export type DeliveryLinkActionState = {
  message?: string;
  personalUrl?: string;
  recipientWhatsAppPhoneE164?: string | null;
  status: 'idle' | 'error' | 'success';
};

export const initialDeliveryLinkActionState: DeliveryLinkActionState = {
  status: 'idle',
};

/** Batch state intentionally exposes aggregate counts only, never raw capability material. */
export type DeliveryBatchActionState = {
  createdCount?: number;
  failedCount?: number;
  message?: string;
  skippedActiveLinkCount?: number;
  status: 'idle' | 'error' | 'partial' | 'success';
  whatsappMissingCreatedCount?: number;
};

export const initialDeliveryBatchActionState: DeliveryBatchActionState = {
  status: 'idle',
};
