import type { Route } from 'next';
import Link from 'next/link';

import { Badge } from '@/design-system';
import type { WeddingReadinessV1 } from '@/modules/readiness';
import { deriveProjectCompassNextStep } from '@/modules/readiness/project-compass';

type ProjectOverviewBootstrapProps = { projectId: string; readiness: WeddingReadinessV1 };
type AttentionKey =
  | 'link_update'
  | 'no_personal_invitation'
  | 'pending_rsvp'
  | 'unpublished_changes'
  | 'whatsapp';
type AttentionItem = {
  description: string;
  href: Route;
  key: AttentionKey;
  label: string;
  section: string;
  title: string;
};

function getStatus(readiness: WeddingReadinessV1) {
  if (readiness.invitation.hasPublishedSnapshot && readiness.invitation.hasUnpublishedChanges) {
    return {
      badge: 'Perubahan belum diterbitkan',
      badgeVariant: 'warning' as const,
      description: 'Tamu masih melihat versi undangan sebelumnya.',
    };
  }

  if (readiness.invitation.hasPublishedSnapshot) {
    return {
      badge: 'Sudah dipublikasikan',
      badgeVariant: 'success' as const,
      description: 'Link Publik sudah menampilkan versi terbaru undangan.',
    };
  }

  return {
    badge: 'Draft belum dipublikasikan',
    badgeVariant: 'brand' as const,
    description: 'Undangan masih menjadi draf pribadi dan belum terlihat oleh tamu.',
  };
}

function getAttentionItems(readiness: WeddingReadinessV1, projectId: string): AttentionItem[] {
  const base = `/dashboard/${projectId}`;
  const items: AttentionItem[] = [];

  if (readiness.invitation.hasUnpublishedChanges) {
    items.push({
      key: 'unpublished_changes',
      section: 'Undangan',
      title: 'Perubahan undangan belum diterbitkan',
      description: 'Versi publik masih menggunakan undangan sebelumnya.',
      label: 'Tinjau undangan',
      href: `${base}/invitation` as Route,
    });
  }

  if ((readiness.guests.needsWhatsAppCount ?? 0) > 0) {
    items.push({
      key: 'whatsapp',
      section: 'Tamu',
      title: 'Nomor WhatsApp perlu dilengkapi',
      description: `${readiness.guests.needsWhatsAppCount ?? 0} tamu belum memiliki nomor WhatsApp valid.`,
      label: 'Lengkapi tamu',
      href: `${base}/guests` as Route,
    });
  }

  if ((readiness.guests.noPersonalInvitationCount ?? 0) > 0) {
    items.push({
      key: 'no_personal_invitation',
      section: 'Bagikan',
      title: 'Undangan Pribadi belum disiapkan',
      description: `${readiness.guests.noPersonalInvitationCount ?? 0} tamu belum memiliki Undangan Pribadi.`,
      label: 'Buka Bagikan',
      href: `${base}/delivery` as Route,
    });
  }

  if ((readiness.guests.needsLinkUpdateCount ?? 0) > 0) {
    items.push({
      key: 'link_update',
      section: 'Tamu',
      title: 'Tautan perlu diperbarui',
      description: `${readiness.guests.needsLinkUpdateCount ?? 0} tautan perlu dikelola sebelum dapat dibagikan.`,
      label: 'Kelola tautan',
      href: `${base}/guests` as Route,
    });
  }

  const pending = Math.max(
    0,
    readiness.guests.activeGuestCount - readiness.responses.nonPendingRsvpCount,
  );

  if (pending > 0 && readiness.responses.hasActivePersonalLinks) {
    items.push({
      key: 'pending_rsvp',
      section: 'Respons Tamu',
      title: 'Respons tamu belum lengkap',
      description: `${pending} tamu belum merespons RSVP.`,
      label: 'Lihat respons',
      href: `${base}/rsvp` as Route,
    });
  }

  return items;
}

function isCoveredByPrimaryStep(attentionKey: AttentionKey, primaryStepKey: string) {
  return (
    (primaryStepKey === 'review_changes' && attentionKey === 'unpublished_changes') ||
    (primaryStepKey === 'prepare_personal_invitations' &&
      attentionKey === 'no_personal_invitation') ||
    (primaryStepKey === 'view_guest_responses' && attentionKey === 'pending_rsvp')
  );
}

function ProgressItem({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href: Route;
}) {
  return (
    <div className="border-seraya-border-default min-w-0 border-b px-0 py-4 last:border-b-0 sm:px-4 md:border-r md:border-b-0 md:first:pl-0 md:last:border-r-0 md:last:pr-0">
      <dt className="text-seraya-text-muted text-[0.625rem] font-semibold tracking-[0.15em] uppercase">
        {label}
      </dt>
      <dd className="mt-1.5 min-w-0">
        <Link
          className="text-seraya-text-primary hover:text-seraya-action-primary focus-visible:outline-seraya-focus-ring inline-flex min-h-9 max-w-full items-center font-serif text-[clamp(1.35rem,2.2vw,1.75rem)] leading-tight font-medium tracking-[-0.025em] transition-colors focus-visible:outline-3 focus-visible:outline-offset-3"
          href={href}
        >
          {value}
        </Link>
      </dd>
    </div>
  );
}

/** Aggregate-only project compass. Detailed work stays in its canonical workspace. */
export function ProjectOverviewBootstrap({ projectId, readiness }: ProjectOverviewBootstrapProps) {
  const base = `/dashboard/${projectId}`;
  const status = getStatus(readiness);
  const nextStep = deriveProjectCompassNextStep(readiness, projectId);
  const attentionItems = getAttentionItems(readiness, projectId)
    .filter((item) => !isCoveredByPrimaryStep(item.key, nextStep.key))
    .slice(0, 3);
  const invitationProgress = readiness.invitation.hasPublishedSnapshot
    ? readiness.invitation.hasUnpublishedChanges
      ? 'Belum diterbitkan'
      : 'Sudah terbit'
    : 'Masih draf';
  const publicHref = readiness.invitation.publishedSlug
    ? (`/${readiness.invitation.publishedSlug}` as Route)
    : null;
  const activeGuestCount = readiness.guests.activeGuestCount;
  const responseProgress = activeGuestCount
    ? `${readiness.responses.nonPendingRsvpCount} dari ${activeGuestCount}`
    : 'Belum ada';

  return (
    <section
      aria-labelledby="owner-workspace-overview-title"
      className="mx-auto max-w-5xl space-y-8 sm:space-y-10"
    >
      <header className="border-seraya-border-default border-b pb-6 sm:pb-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
          <div className="min-w-0">
            <p className="text-seraya-action-primary text-[0.6875rem] font-semibold tracking-[0.16em] uppercase">
              Ringkasan proyek
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
              <h1 className="seraya-display-sm" id="owner-workspace-overview-title">
                {readiness.identity.coupleLabel}
              </h1>
              <Badge variant={status.badgeVariant}>{status.badge}</Badge>
            </div>
            <p className="text-seraya-text-secondary mt-2 text-sm leading-6">
              {status.description}
            </p>
          </div>

          <nav aria-label="Akses undangan" className="flex shrink-0 flex-wrap gap-2">
            <Link
              className="border-seraya-border-default text-seraya-action-primary hover:border-seraya-action-primary focus-visible:outline-seraya-focus-ring inline-flex min-h-10 items-center justify-center rounded-[var(--seraya-radius-sm)] border px-3.5 text-sm font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2"
              href={`${base}/preview` as Route}
            >
              Preview
            </Link>
            {publicHref ? (
              <Link
                className="border-seraya-border-default text-seraya-action-primary hover:border-seraya-action-primary focus-visible:outline-seraya-focus-ring inline-flex min-h-10 items-center justify-center rounded-[var(--seraya-radius-sm)] border px-3.5 text-sm font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2"
                href={publicHref}
              >
                Link Publik
              </Link>
            ) : null}
          </nav>
        </div>
      </header>

      <section
        aria-labelledby="workspace-next-step-title"
        className="border-seraya-border-default bg-seraya-brand-soft border-l-2 px-5 py-5 sm:px-6 sm:py-6"
      >
        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0">
            <p className="text-seraya-action-primary text-[0.6875rem] font-semibold tracking-[0.16em] uppercase">
              Fokus berikutnya
            </p>
            <h2 className="seraya-display-sm mt-1.5" id="workspace-next-step-title">
              {nextStep.label}
            </h2>
            <p className="text-seraya-text-secondary mt-1.5 max-w-2xl text-sm leading-6">
              {nextStep.description}
            </p>
          </div>
          <Link
            className="bg-seraya-action-primary text-seraya-text-inverse hover:bg-seraya-action-primary-hover focus-visible:outline-seraya-focus-ring inline-flex min-h-11 shrink-0 items-center justify-center rounded-[var(--seraya-radius-sm)] px-4 text-sm font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2"
            href={nextStep.href}
          >
            {nextStep.label}
            <span aria-hidden="true" className="ml-2">
              →
            </span>
          </Link>
        </div>
      </section>

      <section aria-labelledby="workspace-progress-title">
        <div>
          <p className="text-seraya-text-muted text-[0.6875rem] font-semibold tracking-[0.16em] uppercase">
            Posisi proyek
          </p>
          <h2 className="seraya-display-sm mt-1.5" id="workspace-progress-title">
            Progress singkat
          </h2>
        </div>

        <dl className="border-seraya-border-default mt-4 grid border-y sm:grid-cols-2 md:grid-cols-4">
          <ProgressItem
            label="Status undangan"
            value={invitationProgress}
            href={`${base}/invitation` as Route}
          />
          <ProgressItem
            label="Tamu aktif"
            value={`${activeGuestCount} tamu`}
            href={`${base}/guests` as Route}
          />
          <ProgressItem
            label="Siap dibagikan"
            value={`${readiness.guests.readyToDistributeCount ?? 0} tamu`}
            href={`${base}/delivery` as Route}
          />
          <ProgressItem
            label="Respons masuk"
            value={responseProgress}
            href={`${base}/rsvp` as Route}
          />
        </dl>
      </section>

      {attentionItems.length ? (
        <section aria-labelledby="workspace-attention-title">
          <div>
            <p className="text-seraya-text-muted text-[0.6875rem] font-semibold tracking-[0.16em] uppercase">
              Perlu dibereskan
            </p>
            <h2 className="seraya-display-sm mt-1.5" id="workspace-attention-title">
              Butuh perhatian Anda
            </h2>
          </div>

          <ul className="border-seraya-border-default mt-4 divide-y border-y">
            {attentionItems.map((item) => (
              <li
                className="group grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                key={item.key}
              >
                <div className="min-w-0">
                  <p className="text-seraya-text-muted text-[0.625rem] font-semibold tracking-[0.14em] uppercase">
                    {item.section}
                  </p>
                  <h3 className="text-seraya-text-primary mt-1 text-sm font-semibold">
                    {item.title}
                  </h3>
                  <p className="text-seraya-text-secondary mt-0.5 text-sm leading-6">
                    {item.description}
                  </p>
                </div>
                <Link
                  className="text-seraya-action-primary focus-visible:outline-seraya-focus-ring inline-flex min-h-10 shrink-0 items-center text-sm font-semibold underline-offset-4 group-hover:underline focus-visible:outline-3 focus-visible:outline-offset-3"
                  href={item.href}
                >
                  {item.label}
                  <span aria-hidden="true" className="ml-2">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section
          aria-labelledby="workspace-clear-title"
          className="border-seraya-border-default border-y py-5"
        >
          <p className="text-seraya-text-muted text-[0.6875rem] font-semibold tracking-[0.16em] uppercase">
            Perhatian
          </p>
          <h2 className="seraya-display-sm mt-1.5" id="workspace-clear-title">
            Tidak ada hal mendesak saat ini.
          </h2>
          <p className="text-seraya-text-secondary mt-1.5 text-sm leading-6">
            Gunakan fokus berikutnya di atas untuk melanjutkan perjalanan proyek.
          </p>
        </section>
      )}
    </section>
  );
}
