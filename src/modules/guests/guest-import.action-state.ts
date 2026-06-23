export type GuestImportActionState = {
  message?: string;
  status: 'error' | 'idle' | 'success';
};

export const initialGuestImportActionState: GuestImportActionState = { status: 'idle' };
