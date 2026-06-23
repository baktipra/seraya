'use client';

import { useActionState, useMemo } from 'react';

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/design-system';
import { startPaymentCheckoutAction } from '@/modules/payments/payment.actions';
import { initialStartPaymentCheckoutActionState } from '@/modules/payments/payment.action-state';
import { getPaymentStatusLabel } from '@/modules/payments/payment.mapper';
import {
  formatPaymentAmountIdr,
  type PaymentOverview,
  type PaymentStatus,
} from '@/modules/payments/payment.types';

type PaymentActivationControlsProps = {
  overview: PaymentOverview;
  projectId: string;
};

function getPaymentCardCopy(status: PaymentStatus | null) {
  if (status === 'paid') {
    return {
      actionLabel: null,
      description: 'Pembayaran kalian sudah terverifikasi oleh penyedia pembayaran.',
      title: 'Pembayaran terverifikasi',
    };
  }

  if (status === 'pending') {
    return {
      actionLabel: 'Lanjutkan pembayaran',
      description: 'Kalian dapat melanjutkan pembayaran yang sedang berjalan.',
      title: 'Menunggu pembayaran',
    };
  }

  if (status === 'failed' || status === 'expired' || status === 'cancelled') {
    return {
      actionLabel: 'Coba pembayaran lagi',
      description: `${getPaymentStatusLabel(status)}. Kalian dapat memulai pembayaran baru.`,
      title: getPaymentStatusLabel(status),
    };
  }

  if (status === 'refunded') {
    return {
      actionLabel: null,
      description:
        'Pembayaran ini telah dikembalikan. Aktivasi baru belum tersedia dari status ini.',
      title: 'Pembayaran dikembalikan',
    };
  }

  return {
    actionLabel: 'Lanjut ke pembayaran',
    description: 'Selesaikan pembayaran untuk menyiapkan undangan kalian menuju publikasi.',
    title: 'Aktifkan undangan',
  };
}

export function PaymentActivationControls({ overview, projectId }: PaymentActivationControlsProps) {
  const action = useMemo(() => startPaymentCheckoutAction.bind(null, projectId), [projectId]);
  const [state, formAction, isActionPending] = useActionState(
    action,
    initialStartPaymentCheckoutActionState,
  );

  if (!overview.isConfigured || !overview.configuration) {
    return (
      <Card aria-labelledby="payment-activation-title" tone="soft">
        <CardHeader>
          <CardTitle
            className="font-sans text-lg font-semibold tracking-[-0.02em]"
            id="payment-activation-title"
          >
            Aktifkan undangan
          </CardTitle>
          <CardDescription>Pembayaran belum tersedia untuk lingkungan ini.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const copy = getPaymentCardCopy(overview.payment?.status ?? null);

  return (
    <Card aria-labelledby="payment-activation-title" tone="soft">
      <CardHeader>
        <CardTitle
          className="font-sans text-lg font-semibold tracking-[-0.02em]"
          id="payment-activation-title"
        >
          {copy.title}
        </CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <p className="text-seraya-text-primary text-xl font-semibold tracking-[-0.02em]">
          {formatPaymentAmountIdr(overview.configuration.amountIdr)}
        </p>
        {state.status === 'error' && state.message ? (
          <p className="text-seraya-status-error text-sm leading-6" role="alert">
            {state.message}
          </p>
        ) : null}
        {copy.actionLabel ? (
          <form action={formAction}>
            <Button loading={isActionPending} size="lg" type="submit">
              {copy.actionLabel}
            </Button>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}
