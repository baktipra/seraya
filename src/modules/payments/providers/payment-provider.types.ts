import type { MidtransEnvironment } from '../payment.config';

export type CreateCheckoutInput = {
  amountIdr: number;
  environment: MidtransEnvironment;
  finishRedirectUrl: string;
  orderId: string;
  serverKey: string;
};

export type CreateCheckoutResult = {
  checkoutUrl: string;
};

export interface PaymentProvider {
  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult>;
}
