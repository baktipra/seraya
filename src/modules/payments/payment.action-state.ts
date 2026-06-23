export type StartPaymentCheckoutActionState = {
  message?: string;
  status: 'idle' | 'error';
};

export const initialStartPaymentCheckoutActionState: StartPaymentCheckoutActionState = {
  status: 'idle',
};
