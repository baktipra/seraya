import Link from 'next/link';

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/design-system';

export const dynamic = 'force-dynamic';

type PaymentReturnPageProps = {
  params: Promise<{ projectId: string }>;
};

/** Browser return is informational only; only a future verified webhook may confirm payment. */
export default async function PaymentReturnPage({ params }: PaymentReturnPageProps) {
  const { projectId } = await params;

  return (
    <Card aria-labelledby="payment-return-title" className="max-w-2xl">
      <CardHeader>
        <CardTitle className="seraya-display-md" id="payment-return-title">
          Terima kasih, pembayaran kalian sedang diproses.
        </CardTitle>
        <CardDescription className="max-w-xl text-base leading-7">
          Status undangan akan diperbarui setelah kami menerima konfirmasi aman dari penyedia
          pembayaran.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 pt-4">
        <p className="border-seraya-status-info/25 bg-seraya-status-info-soft text-seraya-text-secondary rounded-[var(--seraya-radius-md)] border px-4 py-3 text-sm leading-6">
          Menunggu konfirmasi pembayaran
        </p>
        <Link href={`/dashboard/${projectId}`}>
          <Button size="lg" type="button" variant="secondary">
            Kembali ke project
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
