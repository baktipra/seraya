export type GuestbookActionState = {
  message?: string;
  status: 'idle' | 'error' | 'success';
};

export const initialGuestbookActionState: GuestbookActionState = {
  status: 'idle',
};
