import type { Route } from 'next';
import Link from 'next/link';

import { Badge } from '@/design-system';
import { deriveGuestControlConfidence } from '@/modules/readiness/guest-control-confidence';
import type { WeddingReadinessV1 } from '@/modules/readiness/wedding-readiness.types';

type GuestControlConfidenceProps = {
  guests: WeddingReadinessV1['guests'];
  projectId: string;
};

function getStatus(summary: ReturnType<typeof deriveGuestControlConfidence>) {
  if (summary.state === 'no_guests') {
    return {
      badge: 'Belum dimulai',
      badgeVariant: 'brand' as const,
      description: 'Tambahkan penerima di halaman Tamu sebelum menyiapkan Undangan Pribadi.',
      title: 'Belum ada tamu aktif',
    };
  }

  if (summary.state === 'managed') {
    return {
      badge: 'Terkendali',
      badgeVariant: 'success' as const,
      description: `${summary.manageableLinkCount} tamu memiliki link aktif yang dapat diakses kembali oleh owner.`,
      title: 'Akses tamu terkendali',
    };
  }

  if (summary.state === 'needs_setup') {
    return {
      badge: 'Perlu disiapkan',
      badgeVariant: 'brand' as const,
      description: `${summary.missingLinkCount} tamu belum memiliki Undangan Pribadi.`,
      title: 'Undangan Pribadi belum disiapkan',
    };
  }

  return {
    badge: 'Perlu perhatian',
    badgeVariant: 'warning' as const,
    description: `${summary.attentionCount} tamu belum memiliki link yang siap dikelola atau memerlukan pembaruan tautan.`,
    title: 'Beberapa akses tamu perlu ditinjau',
  };
}

function ConfidenceMetric({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: number;
}) {
  return (
    <div className="border-seraya-border-subtle bg-seraya-surface min-w-0 rounded-[var(--seraya-radius-lg)] border p-4">
      <dt className="text-seraya-text-muted text-xs font-medium">{label}</dt>
      <dd className="mt-1.5">
        <strong className="text-seraya-text-primary block text-xl font-semibold">{value}</strong>
        <span className="text-seraya-text-secondary mt-1 block text-xs leading-5">{detail}</span>
      </dd>
    </div>
  );
}

/** Aggregate-only post-publish confidence. Row-level lifecycle actions stay in Tamu. */
export function GuestControlConfidence({ guests, projectId }: GuestControlConfidenceProps) {
  const summary = deriveGuestControlConfidence({
    activeGuestCount: guests.activeGuestCount,
    activePersonalLinkGuestCount: guests.activePersonalLinkGuestCount,
    guestsWithoutActivePersonalLinkCount: guests.guestsWithoutActivePersonalLinkCount,
    needsLinkUpdateCount: guests.needsLinkUpdateCount,
    noPersonalInvitationCount: guests.noPersonalInvitationCount,
    needsWhatsAppCount: guests.needsWhatsAppCount,
    readyToDistributeCount: guests.readyToDistributeCount,
  });
  const status = getStatus(summary);

  return (
    <section
      aria-labelledby="guest-control-confidence-title"
      className="border-seraya-border-subtle bg-seraya-surface-subtle min-w-0 rounded-[var(--seraya-radius-xl)] border p-5 sm:p-6"
      data-guest-control-state={summary.state}
      data-rc2-guest-control-confidence="v1"
    >
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-seraya-action-primary text-xs font-semibold">Kontrol tamu</p>
          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2.5">
            <h2 className="seraya-heading-md" id="guest-control-confidence-title">
              {status.title}
            </h2>
            <Badge variant={status.badgeVariant}>{status.badge}</Badge>
          </div>
          <p className="text-seraya-text-secondary mt-2 max-w-2xl text-sm leading-6">
            {status.description}
          </p>
        </div>

        <Link
          className="text-seraya-action-primary focus-visible:outline-seraya-focus-ring inline-flex min-h-10 shrink-0 items-center rounded-[var(--seraya-radius-sm)] text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-3"
          data-rc2-guest-control-handoff
          href={`/dashboard/${projectId}/guests` as Route}
        >
          Kelola di halaman Tamu →
        </Link>
      </div>

      <dl className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ConfidenceMetric
          detail="Semua penerima aktif pada project ini."
          label="Tamu aktif"
          value={summary.activeGuestCount}
        />
        <ConfidenceMetric
          detail="Link aktif yang dapat disalin kembali."
          label="Link dapat dikelola"
          value={summary.manageableLinkCount}
        />
        <ConfidenceMetric
          detail="Tamu yang belum pernah mempunyai link."
          label="Belum mempunyai link"
          value={summary.missingLinkCount}
        />
        <ConfidenceMetric
          detail="Link aktif lama, nonaktif, atau kedaluwarsa."
          label="Perlu diperbarui"
          value={summary.needsUpdateCount}
        />
      </dl>

      <p
        className="border-seraya-border-subtle text-seraya-text-secondary mt-5 border-t pt-4 text-sm leading-6"
        role="note"
      >
        Terbit ulang hanya memperbarui isi undangan; link personal yang masih aktif tetap berlaku.
        Ringkasan ini menunjukkan status akses, bukan bukti undangan sudah dikirim, dibuka, atau
        dibaca.
      </p>
    </section>
  );
}
