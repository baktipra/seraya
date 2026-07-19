import type { GuestFollowUpHandoffMessageKind } from './follow-up.types';

export type GuestFollowUpHandoffActionState = {
  message?: string;
  messageKind?: GuestFollowUpHandoffMessageKind;
  messageText?: string;
  personalUrl?: string;
  preparedAt?: string;
  status: 'idle' | 'error' | 'success';
  whatsappComposeUrl?: string;
};

export const initialGuestFollowUpHandoffActionState: GuestFollowUpHandoffActionState = {
  status: 'idle',
};
