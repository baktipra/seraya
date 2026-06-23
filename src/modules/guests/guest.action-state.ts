import type { GuestFieldErrors } from './guest.schema';

export type GuestActionState = {
  fieldErrors?: GuestFieldErrors;
  message?: string;
  status: 'idle' | 'error' | 'success';
};

export const initialGuestActionState: GuestActionState = {
  status: 'idle',
};
