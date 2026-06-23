export type GuestLinkActionState = {
  message?: string;
  personalUrl?: string;
  status: 'idle' | 'error' | 'success';
};

export const initialGuestLinkActionState: GuestLinkActionState = {
  status: 'idle',
};
