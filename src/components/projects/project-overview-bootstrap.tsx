import type { Route } from 'next';
import Link from 'next/link';

import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/design-system';
import type { ProjectPublishEligibility } from '@/modules/payments/payment.types';
import type { WeddingReadinessV1 } from '@/modules/readiness';

import { PublishInvitationControls } from './publish-invitation-controls';

type ProjectOverviewBootstrapProps = {
  projectId: string;
  readiness: WeddingReadinessV1;
};

type NextStep = {
  description: string;
  href?: Route;
  label?: string;
  publishIntent?: 'initial' | 'republish';
  title: string;
};

type AttentionItem = {
  description: string;
  href: Route;
  label: string;
  title: string;
};

const templateLabels = {
  aruna: 'Aruna — editorial modern',
  laras: 'Laras — formal malam',
  roselle: 'Roselle — romantis hangat',
} as const;

function getStatus(readiness: WeddingReadinessV1) {
  switch (readiness.invitation.state) {
    case 'published':
      return {
        badge: 'Sudah dipublikasikan',
        description: 'Tamu dapat melihat informasi umum melalui Link Publik.',
        title: 'Undangan sudah dipublikasikan.',
      };
    case 'published_with_unpublished_changes':
      return {
        badge: 'Perubahan belum diterbitkan',
        description:
          'Tamu masih melihat versi undangan sebelumnya sampai kalian menerbitkan ulang.',
        title: 'Ada perubahan yang belum diterbitkan.',
      };
    case 'ready_to_publish':
      return {
        badge: 'Siap diterbitkan',
        description: 'Versi undangan sudah siap ditinjau dan diterbitkan saat kalian setuju.',
        title: 'Undangan siap diterbitkan.',
      };
    case 'draft_ready_unactivated':
      return {
        badge: 'Draft siap ditinjau',
        description: 'Undangan dapat dilihat secara privat sebelum dapat diterbitkan.',
        title: 'Undangan siap ditinjau.',
      };
    case 'draft_incomplete':
      return {
        badge: 'Draft belum siap',
        description: 'Lengkapi informasi utama agar undangan siap ditinjau.',
        title: 'Undangan masih disusun.',
      };
  }

  return {
    badge: 'Draft belum siap',
    description: 'Lengkapi informasi utama agar undangan siap ditinjau.',
    title: 'Undangan masih disusun.',
  };
}

function getNextStep(readiness: WeddingReadinessV1, projectId: string): NextStep {
  const base = `/dashboard/${projectId}`;

  switch (readiness.primaryAction.key) {
    case 'complete_invitation':
      return {
        description: 'Lengkapi bagian utama undangan sebelum melangkah ke proses berikutnya.',
        href: `${base}/invitation` as Route,
        label: 'Lengkapi undangan',
        title: 'Selesaikan undangan kalian',
      };
    case 'preview_invitation':
      return {
        description: 'Tinjau undangan privat dan siapkan versi yang akan dilihat tamu.',
        href: `${base}/invitation` as Route,
        label: 'Tinjau undangan',
        title: 'Tinjau undangan sebelum diterbitkan',
      };
    case 'publish_invitation':
      return {
        description: 'Versi yang diterbitkan akan menjadi versi yang dilihat tamu.',
        publishIntent: 'initial',
        title: 'Tinjau dan terbitkan undangan',
      };
    case 'review_changes':
      return {
        description: 'Tamu masih melihat versi sebelumnya sampai perubahan ini diterbitkan ulang.',
        publishIntent: 'republish',
        title: 'Terbitkan perubahan undangan',
      };
    case 'add_guests':
      return {
        description: 'Tambahkan tamu agar data penerima undangan mulai rapi.',
        href: `${base}/guests` as Route,
        label: 'Tambahkan tamu',
        title: 'Siapkan daftar tamu kalian',
      };
    case 'prepare_personal_invitations':
      return {
        description: 'Siapkan Undangan Pribadi untuk tamu yang akan menerima RSVP dan ucapan.',
        href: `${base}/delivery` as Route,
        label: 'Siapkan Undangan Pribadi',
        title: 'Siapkan undangan untuk dibagikan',
      };
    case 'open_delivery_center':
      return {
        description: 'Undangan Pribadi sudah siap untuk dibagikan secara manual.',
        href: `${base}/delivery` as Route,
        label: 'Mulai bagikan',
        title: 'Mulai bagikan undangan',
      };
    case 'view_guest_responses':
      return {
        description: 'Lihat respons RSVP dan ucapan yang mulai masuk dari tamu.',
        href: `${base}/rsvp` as Route,
        label: 'Lihat Respons Tamu',
        title: 'Respons tamu mulai masuk',
      };
  }

  return {
    description: 'Lengkapi informasi utama agar undangan siap ditinjau.',
    href: `${base}/invitation` as Route,
    label: 'Lengkapi undangan',
    title: 'Selesaikan undangan kalian',
  };
}

function getAttentionItems(readiness: WeddingReadinessV1, projectId: string): AttentionItem[] {
  const base = `/dashboard/${projectId}`;
  const items: AttentionItem[] = [];

  if (!readiness.invitation.hasPublishedSnapshot || readiness.invitation.hasUnpublishedChanges) {
    items.push({
      description: readiness.invitation.hasPublishedSnapshot
        ? 'Perubahan draft belum dilihat tamu.'
        : 'Undangan belum tersedia untuk dilihat tamu.',
      href: `${base}/invitation` as Route,
      label: 'Buka Undangan',
      title: readiness.invitation.hasPublishedSnapshot
        ? 'Perubahan undangan belum diterbitkan'
        : 'Undangan belum diterbitkan',
    });
  }

  if (readiness.guests.whatsappUnavailableCount > 0) {
    items.push({
      description: `${readiness.guests.whatsappUnavailableCount} tamu belum memiliki Nomor WhatsApp.`,
      href: `${base}/guests` as Route,
      label: 'Kelola Tamu',
      title: 'Data kontak perlu dilengkapi',
    });
  }

  if (
    readiness.invitation.hasPublishedSnapshot &&
    readiness.guests.guestsWithoutActivePersonalLinkCount > 0
  ) {
    items.push({
      description: `${readiness.guests.guestsWithoutActivePersonalLinkCount} tamu belum memiliki Undangan Pribadi aktif.`,
      href: `${base}/delivery` as Route,
      label: 'Buka Bagikan',
      title: 'Undangan Pribadi belum siap',
    });
  }

  const pendingResponseCount = Math.max(
    0,
    readiness.guests.activeGuestCount - readiness.responses.nonPendingRsvpCount,
  );
  if (readiness.responses.hasActivePersonalLinks && pendingResponseCount > 0) {
    items.push({
      description: `${pendingResponseCount} tamu belum merespons RSVP.`,
      href: `${base}/rsvp` as Route,
      label: 'Lihat Respons Tamu',
      title: 'Respons tamu perlu ditindaklanjuti',
    });
  }

  return items;
}

function getReadinessPublishEligibility(readiness: WeddingReadinessV1): ProjectPublishEligibility {
  return readiness.invitation.hasVerifiedActivation
    ? { allowed: true, reason: 'verified_payment' }
    : { allowed: false, reason: 'payment_not_verified' };
}

function ProgressItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border-seraya-border-default min-w-0 border-l pl-4 first:border-l-0 first:pl-0">
      <dt className="text-seraya-text-muted text-xs font-semibold tracking-[0.08em] uppercase">
        {label}
      </dt>
      <dd className="text-seraya-text-primary mt-2 text-lg font-semibold tracking-[-0.02em]">
        {value}
      </dd>
    </div>
  );
}

/** Aggregate-only project compass. Per-guest operations intentionally live elsewhere. */
export function ProjectOverviewBootstrap({ projectId, readiness }: ProjectOverviewBootstrapProps) {
  const status = getStatus(readiness);
  const nextStep = getNextStep(readiness, projectId);
  const attentionItems = getAttentionItems(readiness, projectId);
  const invitationProgress = readiness.invitation.hasPublishedSnapshot
    ? readiness.invitation.hasUnpublishedChanges
      ? 'Perubahan belum terbit'
      : 'Sudah live'
    : 'Draft';

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
        {readiness.identity.templateKey ? (
          <p className="text-seraya-text-muted mt-1 text-sm">
            {templateLabels[readiness.identity.templateKey]}
          </p>
        ) : null}
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
            {nextStep.title}
          </h2>
          <p className="text-seraya-text-secondary mt-3 max-w-2xl text-base leading-7">
            {nextStep.description}
          </p>
          <div className="mt-5">
            {nextStep.publishIntent ? (
              <PublishInvitationControls
                hasActiveDraft
                intent={nextStep.publishIntent}
                presentation="readiness"
                projectId={projectId}
                publishedSlug={readiness.invitation.publishedSlug}
                publishEligibility={getReadinessPublishEligibility(readiness)}
              />
            ) : nextStep.href && nextStep.label ? (
              <Link
                className="bg-seraya-action-primary text-seraya-text-inverse hover:bg-seraya-action-primary-hover focus-visible:outline-seraya-focus-ring inline-flex min-h-12 items-center justify-center rounded-[var(--seraya-radius-md)] px-5 text-base font-semibold shadow-[0_8px_18px_rgb(142_75_82_/_0.16)] transition-colors focus-visible:outline-3 focus-visible:outline-offset-2"
                href={nextStep.href}
              >
                {nextStep.label}
              </Link>
            ) : null}
          </div>
        </div>
      </Card>

      <Card aria-labelledby="workspace-progress-title">
        <CardHeader>
          <CardTitle
            className="font-sans text-lg font-semibold tracking-[-0.02em]"
            id="workspace-progress-title"
          >
            Gambaran singkat
          </CardTitle>
          <CardDescription>
            Empat hal yang menunjukkan posisi persiapan kalian saat ini.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5 sm:pt-6">
          <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <ProgressItem label="Undangan" value={invitationProgress} />
            <ProgressItem label="Tamu aktif" value={readiness.guests.activeGuestCount} />
            <ProgressItem
              label="Siap dibagikan"
              value={readiness.guests.activePersonalLinkGuestCount}
            />
            <ProgressItem label="Respons masuk" value={readiness.responses.nonPendingRsvpCount} />
          </dl>
        </CardContent>
      </Card>

      {attentionItems.length > 0 ? (
        <Card aria-labelledby="workspace-attention-title">
          <CardHeader>
            <CardTitle
              className="font-sans text-lg font-semibold tracking-[-0.02em]"
              id="workspace-attention-title"
            >
              Butuh perhatian
            </CardTitle>
            <CardDescription>
              Hal yang paling perlu dibereskan agar perjalanan berikutnya lancar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-5 sm:pt-6">
            {attentionItems.map((item) => (
              <section
                className="border-seraya-border-default grid gap-3 border-t pt-4 first:border-t-0 first:pt-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
                key={item.title}
              >
                <div>
                  <h2 className="text-seraya-text-primary text-sm font-semibold">{item.title}</h2>
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
    </section>
  );
}
