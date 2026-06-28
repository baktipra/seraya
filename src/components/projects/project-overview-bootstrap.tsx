import type { Route } from 'next';
import Link from 'next/link';

import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/design-system';
import { deriveProjectCompassNextStep } from '@/modules/readiness/project-compass';
import type { WeddingReadinessV1 } from '@/modules/readiness';

type ProjectOverviewBootstrapProps = { projectId: string; readiness: WeddingReadinessV1 };
type AttentionItem = { description: string; href: Route; label: string; title: string };

function getStatus(readiness: WeddingReadinessV1) {
  if (readiness.invitation.hasPublishedSnapshot && readiness.invitation.hasUnpublishedChanges)
    return {
      badge: 'Perubahan belum diterbitkan',
      title: 'Ada perubahan yang belum diterbitkan.',
      description: 'Tamu masih melihat versi undangan sebelumnya sampai Anda menerbitkan ulang.',
    };
  if (readiness.invitation.hasPublishedSnapshot)
    return {
      badge: 'Sudah dipublikasikan',
      title: 'Undangan sudah dipublikasikan.',
      description: 'Tamu dapat melihat informasi umum melalui Link Publik.',
    };
  return {
    badge: 'Draft belum dipublikasikan',
    title: 'Undangan belum dipublikasikan.',
    description: 'Lengkapi dan tinjau undangan sebelum membagikannya kepada tamu.',
  };
}

function getAttentionItems(readiness: WeddingReadinessV1, projectId: string): AttentionItem[] {
  const base = `/dashboard/${projectId}`;
  const items: AttentionItem[] = [];
  if (readiness.invitation.hasUnpublishedChanges)
    items.push({
      title: 'Perubahan undangan belum diterbitkan',
      description: 'Tamu masih melihat versi undangan sebelumnya.',
      label: 'Tinjau di Undangan',
      href: `${base}/invitation` as Route,
    });
  if ((readiness.guests.needsWhatsAppCount ?? 0) > 0)
    items.push({
      title: 'Nomor WhatsApp perlu dilengkapi',
      description: `${readiness.guests.needsWhatsAppCount ?? 0} tamu belum memiliki Nomor WhatsApp valid.`,
      label: 'Lengkapi di Tamu',
      href: `${base}/guests` as Route,
    });
  if ((readiness.guests.noPersonalInvitationCount ?? 0) > 0)
    items.push({
      title: 'Undangan Pribadi belum disiapkan',
      description: `${readiness.guests.noPersonalInvitationCount ?? 0} tamu belum memiliki Undangan Pribadi.`,
      label: 'Siapkan di Bagikan',
      href: `${base}/delivery` as Route,
    });
  if ((readiness.guests.needsLinkUpdateCount ?? 0) > 0)
    items.push({
      title: 'Tautan perlu diperbarui',
      description: `${readiness.guests.needsLinkUpdateCount ?? 0} tautan perlu dikelola sebelum dapat dibagikan.`,
      label: 'Kelola di Tamu',
      href: `${base}/guests` as Route,
    });
  const pending = Math.max(
    0,
    readiness.guests.activeGuestCount - readiness.responses.nonPendingRsvpCount,
  );
  if (pending > 0 && readiness.responses.hasActivePersonalLinks)
    items.push({
      title: 'Respons tamu belum lengkap',
      description: `${pending} tamu belum merespons RSVP.`,
      label: 'Lihat Respons Tamu',
      href: `${base}/rsvp` as Route,
    });
  return items.slice(0, 3);
}

function ProgressItem({
  label,
  value,
  href,
}: {
  label: string;
  value: string | number;
  href?: Route;
}) {
  const content = (
    <>
      <dt className="text-seraya-text-muted text-xs font-semibold tracking-[0.08em] uppercase">
        {label}
      </dt>
      <dd className="text-seraya-text-primary mt-2 text-lg font-semibold tracking-[-0.02em]">
        {value}
      </dd>
    </>
  );
  return href ? (
    <Link
      className="border-seraya-border-default focus-visible:outline-seraya-focus-ring min-w-0 rounded-[var(--seraya-radius-sm)] border-l pl-4 first:border-l-0 first:pl-0 focus-visible:outline-3 focus-visible:outline-offset-3"
      href={href}
    >
      {content}
    </Link>
  ) : (
    <div className="border-seraya-border-default min-w-0 border-l pl-4 first:border-l-0 first:pl-0">
      {content}
    </div>
  );
}

/** Aggregate-only project compass. Detailed work stays in Undangan, Tamu, Bagikan, and Respons Tamu. */
export function ProjectOverviewBootstrap({ projectId, readiness }: ProjectOverviewBootstrapProps) {
  const base = `/dashboard/${projectId}`;
  const status = getStatus(readiness);
  const nextStep = deriveProjectCompassNextStep(readiness, projectId);
  const attentionItems = getAttentionItems(readiness, projectId);
  const invitationProgress = readiness.invitation.hasPublishedSnapshot
    ? readiness.invitation.hasUnpublishedChanges
      ? 'Perubahan belum terbit'
      : 'Sudah dipublikasikan'
    : 'Belum dipublikasikan';
  const publicHref = readiness.invitation.publishedSlug
    ? (`/${readiness.invitation.publishedSlug}` as Route)
    : null;

  return (
    <section
      aria-labelledby="owner-workspace-overview-title"
      className="mx-auto max-w-4xl space-y-5 sm:space-y-7"
    >
      <header className="border-seraya-border-default bg-seraya-surface rounded-[var(--seraya-radius-lg)] border px-5 py-6 shadow-[var(--seraya-shadow-soft)] sm:px-7 sm:py-8">
        <Badge variant={readiness.invitation.hasPublishedSnapshot ? 'success' : 'brand'}>
          {status.badge}
        </Badge>
        <p className="text-seraya-text-secondary mt-5 text-sm font-semibold">
          {readiness.identity.coupleLabel}
        </p>
        <h1 className="seraya-display-md mt-3" id="owner-workspace-overview-title">
          {status.title}
        </h1>
        <p className="text-seraya-text-secondary mt-3 max-w-2xl text-base leading-7">
          {status.description}
        </p>
      </header>

      <Card aria-labelledby="workspace-next-step-title" className="overflow-hidden">
        <div className="bg-seraya-brand-soft px-5 py-6 sm:px-7 sm:py-7">
          <p className="text-seraya-action-primary text-xs font-semibold tracking-[0.14em] uppercase">
            Langkah berikutnya
          </p>
          <h2 className="seraya-display-sm mt-3" id="workspace-next-step-title">
            {nextStep.label}
          </h2>
          <p className="text-seraya-text-secondary mt-3 max-w-2xl text-base leading-7">
            {nextStep.description}
          </p>
          <Link
            className="bg-seraya-action-primary text-seraya-text-inverse hover:bg-seraya-action-primary-hover focus-visible:outline-seraya-focus-ring mt-5 inline-flex min-h-12 items-center justify-center rounded-[var(--seraya-radius-md)] px-5 text-base font-semibold shadow-[0_8px_18px_rgb(142_75_82_/_0.16)] transition-colors focus-visible:outline-3 focus-visible:outline-offset-2"
            href={nextStep.href}
          >
            {nextStep.label}
          </Link>
        </div>
      </Card>

      <Card aria-labelledby="workspace-progress-title">
        <CardHeader>
          <CardTitle
            className="font-sans text-lg font-semibold tracking-[-0.02em]"
            id="workspace-progress-title"
          >
            Progress singkat
          </CardTitle>
          <CardDescription>
            Posisi persiapan secara ringkas, tanpa menggantikan halaman kerja detail.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5 sm:pt-6">
          <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <ProgressItem
              label="Undangan"
              value={invitationProgress}
              href={`${base}/invitation` as Route}
            />
            <ProgressItem
              label="Tamu aktif"
              value={`${readiness.guests.activeGuestCount} tersimpan`}
              href={`${base}/guests` as Route}
            />
            <ProgressItem
              label="Siap dibagikan"
              value={`${readiness.guests.readyToDistributeCount ?? 0} tamu`}
              href={`${base}/delivery` as Route}
            />
            <ProgressItem
              label="Respons"
              value={`${readiness.responses.nonPendingRsvpCount} sudah merespons`}
              href={`${base}/rsvp` as Route}
            />
          </dl>
        </CardContent>
      </Card>

      {attentionItems.length ? (
        <Card aria-labelledby="workspace-attention-title">
          <CardHeader>
            <CardTitle
              className="font-sans text-lg font-semibold tracking-[-0.02em]"
              id="workspace-attention-title"
            >
              Butuh perhatian
            </CardTitle>
            <CardDescription>Hal yang paling relevan untuk dibereskan berikutnya.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-5 sm:pt-6">
            {attentionItems.map((item) => (
              <section
                className="border-seraya-border-default grid gap-3 border-t pt-4 first:border-t-0 first:pt-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
                key={item.title}
              >
                <div>
                  <h3 className="text-seraya-text-primary text-sm font-semibold">{item.title}</h3>
                  <p className="text-seraya-text-secondary mt-1 text-sm leading-6">
                    {item.description}
                  </p>
                </div>
                <Link
                  className="text-seraya-action-primary focus-visible:outline-seraya-focus-ring inline-flex min-h-11 items-center rounded-[var(--seraya-radius-sm)] text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-3"
                  href={item.href}
                >
                  {item.label}
                </Link>
              </section>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <nav aria-label="Akses cepat" className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <Link
          className="text-seraya-action-primary font-semibold underline-offset-4 hover:underline"
          href={`${base}/preview` as Route}
        >
          Preview undangan
        </Link>
        {publicHref ? (
          <Link
            className="text-seraya-action-primary font-semibold underline-offset-4 hover:underline"
            href={publicHref}
          >
            Buka Link Publik
          </Link>
        ) : null}
      </nav>
    </section>
  );
}
