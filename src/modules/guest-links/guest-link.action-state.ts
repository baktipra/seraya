export type GuestLinkActionState = {
  message?: string;
  personalUrl?: string;
  recipientWhatsAppPhoneE164?: string | null;
  resultKey?: string;
  status: 'idle' | 'error' | 'success';
};

export const initialGuestLinkActionState: GuestLinkActionState = {
  status: 'idle',
};
