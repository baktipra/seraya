import Link from 'next/link';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/design-system';
import type { RsvpAnalyticsViewModel } from '@/modules/guests/rsvp-analytics.types';

type RsvpAnalyticsDashboardProps = {
  analytics: RsvpAnalyticsViewModel;
  projectId: string;
};

type RsvpBreakdownItemProps = {
  count: number;
  label: string;
  total: number;
  toneClassName: string;
};

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="min-w-0" tone="soft">
      <CardContent className="p-4 sm:p-5">
        <p className="text-seraya-text-muted text-xs font-semibold tracking-[0.08em] uppercase">
          {label}
        </p>
        <p className="text-seraya-text-primary mt-2 text-3xl font-semibold tracking-[-0.04em]">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function RsvpBreakdownItem({ count, label, toneClassName, total }: RsvpBreakdownItemProps) {
  const percentage = total === 0 ? 0 : Math.round((count / total) * 100);
  const ariaMaximum = Math.max(total, 1);

  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-seraya-text-primary text-sm font-semibold">{label}</p>
        <p className="text-seraya-text-secondary text-sm tabular-nums">
          {count} tamu <span className="text-seraya-text-muted">({percentage}%)</span>
        </p>
      </div>
      <div
        aria-label={`${label}: ${count} dari ${total} tamu`}
        aria-valuemax={ariaMaximum}
        aria-valuemin={0}
        aria-valuenow={count}
        aria-valuetext={`${count} dari ${total} tamu`}
        className="bg-seraya-soft h-2 overflow-hidden rounded-full"
        role="progressbar"
      >
        <div
          className={`h-full rounded-full ${toneClassName}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function PendingGuestContent({ analytics }: Pick<RsvpAnalyticsDashboardProps, 'analytics'>) {
  if (analytics.activeGuestCount === 0) {
    return (
      <p className="text-seraya-text-secondary text-sm leading-6">
        Belum ada tamu untuk diringkas.
      </p>
    );
  }

  if (analytics.pendingCount === 0) {
    return (
      <p className="text-seraya-text-secondary text-sm leading-6">
        Semua tamu sudah memberi respons.
      </p>
    );
  }

  return (
    <ul className="border-seraya-border-default divide-seraya-border-default divide-y rounded-[var(--seraya-radius-md)] border">
      {analytics.pendingGuests.map((guest, index) => (
        <li
          className="text-seraya-text-primary px-4 py-3 text-sm font-medium"
          key={`${guest.displayName}-${index}`}
        >
          {guest.displayName}
        </li>
      ))}
    </ul>
  );
}

/** Read-only owner summary composed solely from current active guest RSVP state. */
export function RsvpAnalyticsDashboard({ analytics, projectId }: RsvpAnalyticsDashboardProps) {
  return (
    <section
      aria-labelledby="rsvp-analytics-title"
      className="mx-auto max-w-5xl space-y-5 sm:space-y-7"
    >
      <header className="border-seraya-border-default bg-seraya-surface rounded-[var(--seraya-radius-lg)] border px-5 py-6 shadow-[var(--seraya-shadow-soft)] sm:px-7 sm:py-8">
        <Link
          className="text-seraya-action-primary focus-visible:outline-seraya-focus-ring inline-flex rounded-[var(--seraya-radius-sm)] text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-3"
          href={`/dashboard/${projectId}`}
        >
          ← Kembali ke project
        </Link>
        <h1 className="seraya-display-md mt-5" id="rsvp-analytics-title">
          Ringkasan RSVP
        </h1>
        <p className="text-seraya-text-secondary mt-3 max-w-2xl text-base leading-7">
          Lihat gambaran respons tamu untuk undangan kalian.
        </p>
        <p className="text-seraya-text-muted mt-4 text-sm leading-6">
          Semua angka menghitung data tamu, bukan total orang dalam rombongan.
        </p>
      </header>

      <section
        aria-label="Angka RSVP saat ini"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        <MetricCard label="Tamu terdaftar" value={analytics.activeGuestCount} />
        <MetricCard label="Hadir" value={analytics.attendingCount} />
        <MetricCard label="Tidak hadir" value={analytics.declinedCount} />
        <MetricCard label="Belum merespons" value={analytics.pendingCount} />
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
        <Card aria-labelledby="rsvp-progress-title">
          <CardHeader>
            <CardTitle
              className="font-sans text-lg font-semibold tracking-[-0.02em]"
              id="rsvp-progress-title"
            >
              Sudah merespons
            </CardTitle>
            <CardDescription>
              {analytics.respondedCount} dari {analytics.activeGuestCount} tamu
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-5 sm:pt-6">
            <div className="border-seraya-border-default bg-seraya-canvas rounded-[var(--seraya-radius-md)] border p-4 sm:p-5">
              <p className="text-seraya-text-primary text-4xl font-semibold tracking-[-0.05em] tabular-nums">
                {analytics.respondedPercentage}%
              </p>
              <p className="text-seraya-text-secondary mt-1 text-sm leading-6">
                tamu sudah memberi respons
              </p>
              <div
                aria-label={`Sudah merespons: ${analytics.respondedCount} dari ${analytics.activeGuestCount} tamu`}
                aria-valuemax={Math.max(analytics.activeGuestCount, 1)}
                aria-valuemin={0}
                aria-valuenow={analytics.respondedCount}
                aria-valuetext={`${analytics.respondedCount} dari ${analytics.activeGuestCount} tamu`}
                className="bg-seraya-soft mt-4 h-2.5 overflow-hidden rounded-full"
                role="progressbar"
              >
                <div
                  className="bg-seraya-action-primary h-full rounded-full"
                  style={{ width: `${analytics.respondedPercentage}%` }}
                />
              </div>
            </div>

            <div aria-label="Rincian status RSVP" className="space-y-5">
              <RsvpBreakdownItem
                count={analytics.attendingCount}
                label="Hadir"
                toneClassName="bg-seraya-status-success"
                total={analytics.activeGuestCount}
              />
              <RsvpBreakdownItem
                count={analytics.declinedCount}
                label="Tidak hadir"
                toneClassName="bg-seraya-status-error"
                total={analytics.activeGuestCount}
              />
              <RsvpBreakdownItem
                count={analytics.pendingCount}
                label="Belum merespons"
                toneClassName="bg-seraya-text-muted"
                total={analytics.activeGuestCount}
              />
            </div>
          </CardContent>
        </Card>

        <Card aria-labelledby="pending-guests-title">
          <CardHeader>
            <CardTitle
              className="font-sans text-lg font-semibold tracking-[-0.02em]"
              id="pending-guests-title"
            >
              Menunggu respons
            </CardTitle>
            <CardDescription>Menampilkan hingga 5 tamu yang belum memberi respons.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-5 sm:pt-6">
            <PendingGuestContent analytics={analytics} />
            <Link
              className="text-seraya-action-primary focus-visible:outline-seraya-focus-ring inline-flex min-h-11 items-center rounded-[var(--seraya-radius-sm)] text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-3"
              href={`/dashboard/${projectId}/guests`}
            >
              Kelola tamu
            </Link>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
