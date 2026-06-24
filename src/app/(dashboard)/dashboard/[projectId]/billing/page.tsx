import Link from 'next/link';
import { notFound } from 'next/navigation';

import { PaymentActivationControls } from '@/components/projects/payment-activation-controls';
import { getOwnedProjectContextForRequest } from '@/modules/auth/dashboard-request-context';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/design-system';
import { getPaymentStatusLabel } from '@/modules/payments/payment.mapper';
import {
  getPaymentHistoryForVerifiedProject,
  getPaymentOverviewForVerifiedProject,
} from '@/modules/payments/payment.service';
import { formatPaymentAmountIdr } from '@/modules/payments/payment.types';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

export const dynamic = 'force-dynamic';

type BillingPageProps = {
  params: Promise<{ projectId: string }>;
};

async function loadBillingData(projectId: string) {
  try {
    const project = await getOwnedProjectContextForRequest(projectId);
    const { payments } = await getPaymentHistoryForVerifiedProject(project);
    const overview = await getPaymentOverviewForVerifiedProject(project);

    return { overview, payments, project };
  } catch (error) {
    if (error instanceof ProjectAccessDeniedError) {
      notFound();
    }

    throw error;
  }
}

export default async function BillingPage({ params }: BillingPageProps) {
  const { projectId } = await params;
  const { overview, payments, project } = await loadBillingData(projectId);

  return (
    <div className="space-y-6">
      <Card aria-labelledby="billing-title" className="max-w-3xl">
        <CardHeader>
          <CardTitle className="seraya-display-md" id="billing-title">
            Tagihan undangan
          </CardTitle>
          <CardDescription className="max-w-xl text-base leading-7">
            Riwayat singkat aktivasi undangan kalian. Status final akan diperbarui setelah
            konfirmasi aman dari penyedia pembayaran tersedia.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {payments.length > 0 ? (
            <ul className="space-y-3">
              {payments.map((payment) => (
                <li
                  className="border-seraya-border-default bg-seraya-canvas flex flex-col gap-3 rounded-[var(--seraya-radius-md)] border p-4 sm:flex-row sm:items-center sm:justify-between"
                  key={payment.id}
                >
                  <div>
                    <p className="text-seraya-text-primary font-semibold">
                      Aktivasi undangan Seraya
                    </p>
                    <p className="text-seraya-text-muted mt-1 text-sm">
                      {formatPaymentAmountIdr(payment.amount_idr)} ·{' '}
                      {new Intl.DateTimeFormat('id-ID', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      }).format(new Date(payment.created_at))}
                    </p>
                  </div>
                  <Badge variant={payment.status === 'pending' ? 'brand' : 'neutral'}>
                    {getPaymentStatusLabel(payment.status)}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-seraya-text-secondary text-sm leading-6">
              Belum ada pembayaran yang dimulai.
            </p>
          )}
          <Link href={`/dashboard/${project.id}`}>
            <Button type="button" variant="text">
              ← Kembali ke project
            </Button>
          </Link>
        </CardContent>
      </Card>
      <div className="max-w-3xl">
        <PaymentActivationControls overview={overview} projectId={project.id} />
      </div>
    </div>
  );
}
