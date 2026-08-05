import type { Route } from 'next';
import Link from 'next/link';

import {
  CompassAttentionItem,
  CompassAttentionList,
  CompassClearState,
  CompassContextItem,
  CompassContextList,
  CompassFocus,
  CompassHeader,
  CompassProgressItem,
  CompassProgressStrip,
  CompassWorkspace,
} from '@/components/workspace/compass-primitives';
import { PublishedConfidence } from '@/components/projects/published-confidence';
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
      description:
        'Undangan tetap aktif. Tamu masih melihat versi terbit sebelumnya sampai Anda menerbitkan ulang.',
    };
  }

  if (readiness.invitation.hasPublishedSnapshot) {
    return {
      badge: 'Terbit',
      badgeVariant: 'success' as const,
      description: 'Undangan aktif. Tamu melihat versi undangan yang terakhir diterbitkan.',
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
  const responseHref = `${base}/rsvp` as Route;

  return (
    <CompassWorkspace labelledBy="owner-workspace-overview-title">
      <CompassHeader
        actions={
          <nav aria-label="Akses undangan" className="flex min-w-0 flex-wrap gap-2">
            <Link
              className="border-seraya-border-default bg-seraya-surface-subtle text-seraya-action-primary hover:border-seraya-action-primary hover:bg-seraya-brand-softer focus-visible:outline-seraya-focus-ring inline-flex min-h-11 items-center justify-center rounded-[var(--seraya-radius-sm)] border px-3.5 text-sm font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2"
              href={`${base}/preview` as Route}
            >
              Preview
            </Link>
            {publicHref ? (
              <Link
                className="border-seraya-border-default bg-seraya-surface-subtle text-seraya-action-primary hover:border-seraya-action-primary hover:bg-seraya-brand-softer focus-visible:outline-seraya-focus-ring inline-flex min-h-11 items-center justify-center rounded-[var(--seraya-radius-sm)] border px-3.5 text-sm font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2"
                href={publicHref}
              >
                Link Publik
              </Link>
            ) : null}
          </nav>
        }
        description={status.description}
        eyebrow="Ringkasan proyek"
        status={<Badge variant={status.badgeVariant}>{status.badge}</Badge>}
        title={readiness.identity.coupleLabel}
        titleId="owner-workspace-overview-title"
      />

      {readiness.invitation.hasPublishedSnapshot ? (
        <PublishedConfidence hasUnpublishedChanges={readiness.invitation.hasUnpublishedChanges} />
      ) : null}

      <CompassFocus
        actionLabel={nextStep.label}
        description={nextStep.description}
        eyebrow={
          readiness.invitation.hasPublishedSnapshot
            ? 'Operasional setelah terbit'
            : 'Fokus berikutnya'
        }
        href={nextStep.href}
        title={nextStep.label}
        titleId="workspace-next-step-title"
      />

      <CompassProgressStrip titleId="workspace-progress-title">
        <CompassProgressItem
          href={`${base}/invitation` as Route}
          label="Status undangan"
          value={invitationProgress}
        />
        <CompassProgressItem
          href={`${base}/guests` as Route}
          label="Tamu aktif"
          value={`${activeGuestCount} tamu`}
        />
        <CompassProgressItem
          href={`${base}/delivery` as Route}
          label="Siap dibagikan"
          value={`${readiness.guests.readyToDistributeCount ?? 0} tamu`}
        />
        <CompassProgressItem href={responseHref} label="Respons masuk" value={responseProgress} />
      </CompassProgressStrip>

      {attentionItems.length ? (
        <CompassAttentionList titleId="workspace-attention-title">
          {attentionItems.map((item) => (
            <CompassAttentionItem
              actionLabel={item.label}
              description={item.description}
              href={item.href}
              key={item.key}
              section={item.section}
              title={item.title}
            />
          ))}
        </CompassAttentionList>
      ) : (
        <CompassClearState titleId="workspace-clear-title" />
      )}

      <CompassContextList titleId="workspace-context-title">
        <CompassContextItem
          href={responseHref}
          label="Hadir terkonfirmasi"
          value={`${readiness.responses.confirmedAttendeeCount} orang`}
        />
        <CompassContextItem
          href={responseHref}
          label="Tidak hadir"
          value={`${readiness.responses.declinedCount} tamu`}
        />
        <CompassContextItem
          href={responseHref}
          label="Ucapan masuk"
          value={`${readiness.responses.activeGuestbookCount} ucapan`}
        />
      </CompassContextList>
    </CompassWorkspace>
  );
}
