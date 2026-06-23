import type { PaymentStatus } from './payment.types';

export function getPaymentStatusLabel(status: PaymentStatus) {
  const labels: Record<PaymentStatus, string> = {
    cancelled: 'Pembayaran dibatalkan',
    created: 'Pembayaran sedang disiapkan',
    expired: 'Pembayaran kedaluwarsa',
    failed: 'Pembayaran gagal',
    paid: 'Pembayaran terverifikasi',
    pending: 'Menunggu pembayaran',
    refunded: 'Pembayaran dikembalikan',
  };

  return labels[status];
}
