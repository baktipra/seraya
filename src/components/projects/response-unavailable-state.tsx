import Link from 'next/link';

import { Card, CardContent } from '@/design-system';

type ResponseUnavailableStateProps = {
  kind: 'guestbook' | 'rsvp';
  projectId: string;
  showDeliveryAction: boolean;
};

export function ResponseUnavailableState({
  kind,
  projectId,
  showDeliveryAction,
}: ResponseUnavailableStateProps) {
  const isRsvp = kind === 'rsvp';
  const title = isRsvp ? 'Respons tamu belum tersedia' : 'Ucapan & Doa belum tersedia';
  const description = isRsvp
    ? 'Status RSVP akan muncul setelah undangan pribadi mulai disiapkan.'
    : 'Ucapan dari tamu akan muncul setelah undangan pribadi mulai disiapkan.';

  return (
    <section aria-labelledby="response-unavailable-title" className="mx-auto max-w-3xl">
      <Card className="overflow-hidden">
        <div className="bg-seraya-brand-soft px-5 py-7 sm:px-7 sm:py-8">
          <p className="text-seraya-action-primary text-xs font-semibold tracking-[0.14em] uppercase">
            Respons Tamu
          </p>
          <h1 className="seraya-display-md mt-3" id="response-unavailable-title">
            {title}
          </h1>
          <p className="text-seraya-text-secondary mt-3 max-w-xl text-base leading-7">
            {description}
          </p>
        </div>
        <CardContent className="flex flex-wrap gap-3 pt-5 sm:pt-6">
          {showDeliveryAction ? (
            <Link
              className="bg-seraya-action-primary text-seraya-text-inverse hover:bg-seraya-action-primary-hover focus-visible:outline-seraya-focus-ring inline-flex min-h-11 items-center justify-center rounded-[var(--seraya-radius-md)] px-4 text-sm font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2"
              href={`/dashboard/${projectId}/delivery`}
            >
              Buka pusat pengiriman
            </Link>
          ) : null}
          <Link
            className="text-seraya-action-primary focus-visible:outline-seraya-focus-ring inline-flex min-h-11 items-center rounded-[var(--seraya-radius-sm)] px-1 text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-3"
            href={`/dashboard/${projectId}`}
          >
            Kembali ke ringkasan
          </Link>
        </CardContent>
      </Card>
    </section>
  );
}
