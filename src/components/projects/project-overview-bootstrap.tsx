import type { Route } from 'next';
import Link from 'next/link';

import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/design-system';
import { type ProjectPublishEligibility } from '@/modules/payments/payment.types';
import type { WeddingReadinessV1 } from '@/modules/readiness';

import { PublishInvitationControls } from './publish-invitation-controls';

type ProjectOverviewBootstrapProps = {
  projectId: string;
  readiness: WeddingReadinessV1;
};

type ActionCopy = {
  description: string;
  label?: string;
  publishIntent?: 'initial' | 'republish';
  secondary?: { href: Route; label: string };
  title: string;
};

type Chapter = {
  action?: { href: Route; label: string };
  facts: Array<{ label: string; value: string | number }>;
  status: string;
  title: string;
};

const templateLabels = {
  aruna: 'Aruna — editorial modern',
  laras: 'Laras — formal malam',
  roselle: 'Roselle — romantis hangat',
} as const;

function getStateLabel(readiness: WeddingReadinessV1) {
  switch (readiness.invitation.state) {
    case 'draft_incomplete':
      return 'Sedang disusun';
    case 'draft_ready_unactivated':
      return 'Siap ditinjau';
    case 'ready_to_publish':
      return 'Siap diterbitkan';
    case 'published_with_unpublished_changes':
      return 'Ada perubahan belum diterbitkan';
    case 'published':
      return 'Sudah diterbitkan';
  }
}

function getActionCopy(readiness: WeddingReadinessV1, projectId: string): ActionCopy {
  switch (readiness.primaryAction.key) {
    case 'complete_invitation':
      return {
        description: 'Lengkapi informasi utama agar bentuk undangan mulai bisa ditinjau.',
        label: 'Lengkapi undangan',
        title: 'Undangan kalian sedang disusun',
      };
    case 'preview_invitation':
      return {
        description: 'Lihat versi privat sebelum memutuskan kapan undangan diterbitkan.',
        label: 'Lihat preview',
        secondary: {
          href: `/dashboard/${projectId}/billing` as Route,
          label: 'Aktifkan untuk diterbitkan',
        },
        title: 'Undangan siap ditinjau',
      };
    case 'publish_invitation':
      return {
        description: 'Versi yang diterbitkan akan menjadi versi yang tamu lihat dan bagikan.',
        publishIntent: 'initial',
        secondary: {
          href: `/dashboard/${projectId}/preview` as Route,
          label: 'Lihat preview',
        },
        title: 'Undangan siap diterbitkan',
      };
    case 'review_changes':
      return {
        description:
          'Tamu masih melihat versi undangan sebelumnya sampai kalian menerbitkan ulang.',
        publishIntent: 'republish',
        secondary: {
          href: `/dashboard/${projectId}/preview` as Route,
          label: 'Tinjau preview',
        },
        title: 'Ada perubahan yang belum diterbitkan',
      };
    case 'add_guests':
      return {
        description: 'Tambahkan daftar tamu saat kalian siap mengirim undangan secara personal.',
        label: 'Tambah tamu',
        title: 'Undangan sudah diterbitkan',
      };
    case 'prepare_personal_invitations':
      return {
        description: 'Buat undangan pribadi agar setiap tamu menerima link untuk RSVP dan ucapan.',
        label: 'Siapkan undangan pribadi',
        title: 'Tamu sudah siap disusun',
      };
    case 'open_delivery_center':
      return {
        description: 'Undangan pribadi siap dibagikan secara manual melalui WhatsApp atau tautan.',
        label: 'Buka pusat pengiriman',
        title: 'Undangan pribadi siap dibagikan',
      };
    case 'view_guest_responses':
      return {
        description: 'Lihat status RSVP, jumlah orang yang dikonfirmasi, dan ucapan yang diterima.',
        label: 'Lihat respons tamu',
        title: 'Respons tamu mulai masuk',
      };
    default:
      throw new Error('Unknown wedding readiness primary action.');
  }
}

function getInvitationChapter(readiness: WeddingReadinessV1, projectId: string): Chapter {
  const base = `/dashboard/${projectId}`;
  const template = readiness.identity.templateKey
    ? templateLabels[readiness.identity.templateKey]
    : 'Template belum tersedia';

  switch (readiness.invitation.state) {
    case 'draft_incomplete':
      return {
        action: { href: `${base}/invitation` as Route, label: 'Lengkapi undangan' },
        facts: [{ label: 'Arah undangan', value: template }],
        status: 'Informasi utama masih perlu dilengkapi.',
        title: 'Undangan',
      };
    case 'draft_ready_unactivated':
      return {
        action: { href: `${base}/preview` as Route, label: 'Lihat preview' },
        facts: [{ label: 'Arah undangan', value: template }],
        status: 'Versi privat siap ditinjau.',
        title: 'Undangan',
      };
    case 'ready_to_publish':
      return {
        action: { href: `${base}/preview` as Route, label: 'Lihat preview' },
        facts: [{ label: 'Arah undangan', value: template }],
        status: 'Aktivasi terverifikasi. Versi terbit siap dibuat.',
        title: 'Undangan',
      };
    case 'published_with_unpublished_changes':
      return {
        action: { href: `${base}/preview` as Route, label: 'Tinjau preview' },
        facts: [{ label: 'Arah undangan', value: template }],
        status: 'Ada perubahan tersimpan yang belum dilihat tamu.',
        title: 'Undangan',
      };
    case 'published':
      return {
        action: { href: `${base}/invitation` as Route, label: 'Kelola undangan' },
        facts: [{ label: 'Arah undangan', value: template }],
        status: 'Versi terbit saat ini aktif untuk tamu.',
        title: 'Undangan',
      };
  }
}

function getGuestChapter(readiness: WeddingReadinessV1, projectId: string): Chapter {
  const base = `/dashboard/${projectId}`;
  const hasGuests = readiness.guests.activeGuestCount > 0;
  const hasPublished = readiness.invitation.hasPublishedSnapshot;
  const linksReady =
    hasGuests &&
    readiness.guests.activePersonalLinkGuestCount === readiness.guests.activeGuestCount;

  return {
    action: {
      href: (hasPublished && hasGuests ? `${base}/delivery` : `${base}/guests`) as Route,
      label: hasPublished && hasGuests ? 'Buka pusat pengiriman' : 'Kelola tamu',
    },
    facts: hasGuests
      ? [
          { label: 'Tamu aktif', value: readiness.guests.activeGuestCount },
          { label: 'WhatsApp tersedia', value: readiness.guests.whatsappAvailableCount },
          { label: 'Undangan pribadi aktif', value: readiness.guests.activePersonalLinkGuestCount },
        ]
      : [{ label: 'Tamu aktif', value: 0 }],
    status: !hasGuests
      ? 'Belum ada tamu yang disiapkan.'
      : !hasPublished
        ? 'Daftar tamu dapat disusun sekarang. Undangan pribadi tersedia setelah undangan diterbitkan.'
        : linksReady
          ? 'Undangan pribadi siap dibagikan.'
          : 'Sebagian tamu masih belum memiliki undangan pribadi aktif.',
    title: 'Tamu',
  };
}

function getResponseChapter(readiness: WeddingReadinessV1, projectId: string): Chapter {
  const base = `/dashboard/${projectId}`;
  const hasResponses =
    readiness.responses.nonPendingRsvpCount > 0 || readiness.responses.activeGuestbookCount > 0;

  return {
    action: readiness.responses.hasActivePersonalLinks
      ? { href: `${base}/rsvp` as Route, label: 'Lihat respons tamu' }
      : undefined,
    facts: readiness.responses.hasActivePersonalLinks
      ? [
          { label: 'Status RSVP tercatat', value: readiness.responses.nonPendingRsvpCount },
          { label: 'Orang dikonfirmasi', value: readiness.responses.confirmedAttendeeCount },
          { label: 'Ucapan aktif', value: readiness.responses.activeGuestbookCount },
        ]
      : [],
    status: !readiness.responses.hasActivePersonalLinks
      ? 'Respons tamu akan tersedia setelah undangan pribadi mulai disiapkan.'
      : hasResponses
        ? 'Respons tamu mulai masuk.'
        : 'Status RSVP dan ucapan akan muncul saat mulai diterima.',
    title: 'Respons',
  };
}

type PersonalInvitationJourneyCopy = {
  action: { href: Route; label: string };
  description: string;
};

function getPersonalInvitationJourneyCopy(
  readiness: WeddingReadinessV1,
  projectId: string,
): PersonalInvitationJourneyCopy {
  const base = `/dashboard/${projectId}`;
  const hasGuests = readiness.guests.activeGuestCount > 0;
  const activePersonalLinks = readiness.guests.activePersonalLinkGuestCount;

  if (!hasGuests) {
    return {
      action: { href: `${base}/guests` as Route, label: 'Kelola Tamu' },
      description: 'Untuk menerima RSVP, tambahkan tamu lalu buat Undangan Pribadi.',
    };
  }

  if (activePersonalLinks === 0) {
    return {
      action: { href: `${base}/delivery` as Route, label: 'Buka Delivery Center' },
      description:
        'Untuk menerima RSVP, buat Undangan Pribadi untuk setiap tamu sebelum membagikannya.',
    };
  }

  if (activePersonalLinks < readiness.guests.activeGuestCount) {
    return {
      action: { href: `${base}/delivery` as Route, label: 'Buka Delivery Center' },
      description:
        'Sebagian tamu belum memiliki Undangan Pribadi. Siapkan link mereka sebelum membagikannya.',
    };
  }

  return {
    action: { href: `${base}/delivery` as Route, label: 'Buka Delivery Center' },
    description:
      'Undangan Pribadi aktif adalah tempat tamu menerima sapaan, mengisi RSVP, dan meninggalkan ucapan.',
  };
}

function InvitationJourneyClarity({
  projectId,
  readiness,
}: {
  projectId: string;
  readiness: WeddingReadinessV1;
}) {
  const publicSlug = readiness.invitation.publishedSlug;

  if (!readiness.invitation.hasPublishedSnapshot || !publicSlug) {
    return null;
  }

  const personal = getPersonalInvitationJourneyCopy(readiness, projectId);

  return (
    <Card aria-labelledby="invitation-journey-clarity-title">
      <CardHeader>
        <CardTitle
          className="font-sans text-lg font-semibold tracking-[-0.02em]"
          id="invitation-journey-clarity-title"
        >
          Cara membagikan undangan
        </CardTitle>
        <CardDescription>
          Pilih link sesuai kebutuhan tamu. RSVP dan ucapan hanya tersedia melalui Undangan Pribadi.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5 pt-5 sm:grid-cols-2 sm:pt-6">
        <section className="border-seraya-border-default min-w-0 border-b pb-5 sm:border-r sm:border-b-0 sm:pr-5 sm:pb-0">
          <p className="text-seraya-action-primary text-xs font-semibold tracking-[0.14em] uppercase">
            Link Publik
          </p>
          <h3 className="text-seraya-text-primary mt-2 text-base font-semibold">
            Untuk melihat detail undangan
          </h3>
          <p className="text-seraya-text-secondary mt-2 text-sm leading-6">
            Bagikan untuk melihat detail undangan. Tidak memuat RSVP atau ucapan tamu.
          </p>
          <Link
            className="text-seraya-action-primary focus-visible:outline-seraya-focus-ring mt-4 inline-flex min-h-11 items-center rounded-[var(--seraya-radius-sm)] text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-3"
            href={`/${publicSlug}` as Route}
            rel="noreferrer"
            target="_blank"
          >
            Buka Link Publik
          </Link>
        </section>
        <section className="min-w-0">
          <p className="text-seraya-action-primary text-xs font-semibold tracking-[0.14em] uppercase">
            Undangan Pribadi
          </p>
          <h3 className="text-seraya-text-primary mt-2 text-base font-semibold">
            Untuk RSVP dan ucapan tamu
          </h3>
          <p className="text-seraya-text-secondary mt-2 text-sm leading-6">
            Buat untuk setiap tamu agar mereka menerima sapaan personal, mengisi RSVP, dan
            meninggalkan ucapan.
          </p>
          <p className="text-seraya-text-muted mt-3 text-sm leading-6">{personal.description}</p>
          <Link
            className="text-seraya-action-primary focus-visible:outline-seraya-focus-ring mt-4 inline-flex min-h-11 items-center rounded-[var(--seraya-radius-sm)] text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-3"
            href={personal.action.href}
          >
            {personal.action.label}
          </Link>
        </section>
      </CardContent>
    </Card>
  );
}

function getReadinessPublishEligibility(readiness: WeddingReadinessV1): ProjectPublishEligibility {
  return readiness.invitation.hasVerifiedActivation
    ? { allowed: true, reason: 'verified_payment' }
    : { allowed: false, reason: 'payment_not_verified' };
}

function ReadinessChapter({ chapter }: { chapter: Chapter }) {
  return (
    <section className="border-seraya-border-default grid gap-4 border-t pt-5 first:border-t-0 first:pt-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
      <div className="space-y-2">
        <h2 className="text-seraya-text-primary text-base font-semibold">{chapter.title}</h2>
        <p className="text-seraya-text-secondary text-sm leading-6">{chapter.status}</p>
        {chapter.facts.length > 0 ? (
          <dl className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
            {chapter.facts.map((fact) => (
              <div className="text-sm" key={fact.label}>
                <dt className="text-seraya-text-muted inline">{fact.label}: </dt>
                <dd className="text-seraya-text-primary inline font-semibold">{fact.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
      {chapter.action ? (
        <Link
          className="text-seraya-action-primary focus-visible:outline-seraya-focus-ring inline-flex min-h-11 items-center rounded-[var(--seraya-radius-sm)] text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-3"
          href={chapter.action.href}
        >
          {chapter.action.label}
        </Link>
      ) : null}
    </section>
  );
}

/** Calm project home driven exclusively by the owner-safe readiness projection. */
export function ProjectOverviewBootstrap({ projectId, readiness }: ProjectOverviewBootstrapProps) {
  const action = getActionCopy(readiness, projectId);
  const invitationChapter = getInvitationChapter(readiness, projectId);
  const guestChapter = getGuestChapter(readiness, projectId);
  const responseChapter = getResponseChapter(readiness, projectId);

  return (
    <section
      aria-labelledby="wedding-readiness-title"
      className="mx-auto max-w-4xl space-y-5 sm:space-y-7"
    >
      <header className="border-seraya-border-default bg-seraya-surface rounded-[var(--seraya-radius-lg)] border px-5 py-6 shadow-[var(--seraya-shadow-soft)] sm:px-7 sm:py-8">
        <Badge variant={readiness.invitation.hasPublishedSnapshot ? 'success' : 'brand'}>
          {getStateLabel(readiness)}
        </Badge>
        <p className="text-seraya-text-secondary mt-5 text-sm font-semibold">
          {readiness.identity.coupleLabel}
        </p>
        {readiness.identity.templateKey ? (
          <p className="text-seraya-text-muted mt-1 text-sm">
            {templateLabels[readiness.identity.templateKey]}
          </p>
        ) : null}
        <h1 className="seraya-display-md mt-3" id="wedding-readiness-title">
          Ringkasan persiapan undangan
        </h1>
        <p className="text-seraya-text-secondary mt-3 max-w-2xl text-base leading-7">
          Ikuti satu langkah yang paling relevan sekarang, lalu Seraya akan membuka langkah
          berikutnya saat waktunya tepat.
        </p>
      </header>

      <Card aria-labelledby="readiness-primary-action-title" className="overflow-hidden">
        <div className="bg-seraya-brand-soft px-5 py-6 sm:px-7 sm:py-7">
          <p className="text-seraya-action-primary text-xs font-semibold tracking-[0.14em] uppercase">
            Langkah berikutnya
          </p>
          <h2 className="seraya-display-sm mt-3" id="readiness-primary-action-title">
            {action.title}
          </h2>
          <p className="text-seraya-text-secondary mt-3 max-w-2xl text-base leading-7">
            {action.description}
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:items-start">
            {action.publishIntent ? (
              <PublishInvitationControls
                hasActiveDraft
                intent={action.publishIntent}
                presentation="readiness"
                projectId={projectId}
                publishedSlug={null}
                publishEligibility={getReadinessPublishEligibility(readiness)}
              />
            ) : action.label && readiness.primaryAction.href ? (
              <Link
                className="bg-seraya-action-primary text-seraya-text-inverse hover:bg-seraya-action-primary-hover focus-visible:outline-seraya-focus-ring inline-flex min-h-12 items-center justify-center rounded-[var(--seraya-radius-md)] px-5 text-base font-semibold shadow-[0_8px_18px_rgb(142_75_82_/_0.16)] transition-colors focus-visible:outline-3 focus-visible:outline-offset-2"
                href={readiness.primaryAction.href as Route}
              >
                {action.label}
              </Link>
            ) : null}
            {action.secondary ? (
              <Link
                className="text-seraya-action-primary focus-visible:outline-seraya-focus-ring inline-flex min-h-11 items-center rounded-[var(--seraya-radius-sm)] px-1 text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-3"
                href={action.secondary.href}
              >
                {action.secondary.label}
              </Link>
            ) : null}
          </div>
        </div>
      </Card>

      <InvitationJourneyClarity projectId={projectId} readiness={readiness} />

      <Card aria-labelledby="readiness-chapters-title">
        <CardHeader>
          <CardTitle
            className="font-sans text-lg font-semibold tracking-[-0.02em]"
            id="readiness-chapters-title"
          >
            Perjalanan kalian
          </CardTitle>
          <CardDescription>
            Bentuk undangan, siapkan tamu, lalu pahami respons yang tercatat.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-5 sm:pt-6">
          <ReadinessChapter chapter={invitationChapter} />
          <ReadinessChapter chapter={guestChapter} />
          <ReadinessChapter chapter={responseChapter} />
        </CardContent>
      </Card>
    </section>
  );
}
