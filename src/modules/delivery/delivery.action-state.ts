export type DeliveryLinkActionState = {
  message?: string;
  personalUrl?: string;
  recipientWhatsAppPhoneE164?: string | null;
  status: 'idle' | 'error' | 'success';
};

export const initialDeliveryLinkActionState: DeliveryLinkActionState = {
  status: 'idle',
};
