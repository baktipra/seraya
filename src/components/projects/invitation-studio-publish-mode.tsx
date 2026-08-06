'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useMemo } from 'react';

import type { InvitationDraft } from '@/modules/invitations/invitation-draft.types';
import type { PaymentOverview } from '@/modules/payments';
import type { PublishedInvitationSnapshot } from '@/modules/publications/publication.types';
import type { InvitationReadinessV1 } from '@/modules/readiness';

import { PublishInvitationControls } from './publish-invitation-controls';
import {
  getInvitationEditorSectionStatuses,
  invitationEditorSections,
  type InvitationEditorSectionKey,
  type InvitationEditorSectionStatus,
} from './invitation-editor-workspace';
import { useInvitationStudioState } from './invitation-studio-provider';
import styles from './invitation-studio-publish-mode.module.css';

const readinessChapterOrder: readonly InvitationEditorSectionKey[] = [
  'style',
  'opening',
  'couple',
  'story',
  'schedule',
  'gallery',
  'gift',
  'rsvp',
  'closing',
];

const readinessStatusCopy: Record<InvitationEditorSectionStatus, string> = {
  complete: 'Siap',
  error: 'Perlu diperbaiki',
  incomplete: 'Belum lengkap',
  optional_off: 'Tidak ditampilkan',
};

export type InvitationStudioPublishDecisionKind =
  | 'save-local'
  | 'fix-readiness'
  | 'activate-payment'
  | 'publish-first'
  | 'republish'
  | 'open-published';

export type InvitationStudioPublishDecision = {
  description: string;
  kind: InvitationStudioPublishDecisionKind;
  label: string;
  title: string;
};

export function getInvitationStudioPublishDecision({
  hasBlocker,
  isDirty,
  readinessState,
}: {
  hasBlocker: boolean;
  isDirty: boolean;
  readinessState: InvitationReadinessV1['invitation']['state'];
}): InvitationStudioPublishDecision {
  if (isDirty) {
    return {
      description:
        'Versi lokal masih berbeda dari draf server. Gunakan satu tombol Simpan perubahan di header Studio sebelum mengambil keputusan publikasi.',
      kind: 'save-local',
      label: 'Simpan dari header',
      title: 'Simpan perubahan lokal terlebih dahulu.',
    };
  }

  if (hasBlocker || readinessState === 'draft_incomplete') {
    return {
      description: 'Setidaknya satu bagian wajib pada draf tersimpan belum siap untuk diterbitkan.',
      kind: 'fix-readiness',
      label: 'Lengkapi bagian bermasalah',
      title: 'Draf tersimpan belum siap.',
    };
  }

  if (readinessState === 'draft_ready_unactivated') {
    return {
      description:
        'Draf utama sudah siap, tetapi aktivasi pembayaran terverifikasi masih diperlukan sebelum publikasi pertama.',
      kind: 'activate-payment',
      label: 'Selesaikan pembayaran',
      title: 'Aktifkan undangan untuk penerbitan.',
    };
  }

  if (readinessState === 'ready_to_publish') {
    return {
      description: 'Draf tersimpan siap menjadi versi pertama yang dapat dibuka tamu.',
      kind: 'publish-first',
      label: 'Terbitkan undangan',
      title: 'Undangan siap diterbitkan.',
    };
  }

  if (readinessState === 'published_with_unpublished_changes') {
    return {
      description:
        'Tamu masih melihat revisi terbit sebelumnya. Terbitkan perubahan agar draf tersimpan menjadi versi tamu terbaru.',
      kind: 'republish',
      label: 'Terbitkan perubahan',
      title: 'Draf tersimpan lebih baru dari versi tamu.',
    };
  }

  return {
    description: 'Draf tersimpan dan versi yang dilihat tamu sedang sinkron.',
    kind: 'open-published',
    label: 'Buka undangan terbit',
    title: 'Undangan aktif dan sinkron.',
  };
}

function getInvitationChapterHref(projectId: string, chapter: InvitationEditorSectionKey): Route {
  return (
    chapter === 'style'
      ? `/dashboard/${projectId}/invitation?mode=design`
      : chapter === 'gallery'
        ? `/dashboard/${projectId}/invitation?mode=media`
        : `/dashboard/${projectId}/invitation?mode=content#bagian-${chapter}`
  ) as Route;
}

export type InvitationStudioPublishModeProps = {
  draft: InvitationDraft;
  paymentOverview: PaymentOverview;
  projectId: string;
  publishedSnapshot: PublishedInvitationSnapshot | null;
  readiness: InvitationReadinessV1;
};

export function InvitationStudioPublishMode({
  draft,
  paymentOverview,
  projectId,
  publishedSnapshot,
  readiness,
}: InvitationStudioPublishModeProps) {
  const { isDirty } = useInvitationStudioState();
  const chapters = useMemo(() => {
    const statuses = getInvitationEditorSectionStatuses(draft);

    return readinessChapterOrder.map((key) => {
      const chapter = invitationEditorSections.find((candidate) => candidate.key === key);

      if (!chapter) throw new Error(`Unknown invitation readiness chapter: ${key}`);
      return { ...chapter, status: statuses[key] };
    });
  }, [draft]);
  const blockers = chapters.filter(
    (chapter) =>
      !chapter.optional && (chapter.status === 'error' || chapter.status === 'incomplete'),
  );
  const attention = chapters.filter(
    (chapter) =>
      chapter.optional && (chapter.status === 'error' || chapter.status === 'incomplete'),
  );
  const firstBlocker = blockers[0] ?? attention[0] ?? null;
  const readyCount = chapters.filter(
    (chapter) => chapter.status === 'complete' || chapter.status === 'optional_off',
  ).length;
  const decision = getInvitationStudioPublishDecision({
    hasBlocker: blockers.length > 0,
    isDirty,
    readinessState: readiness.invitation.state,
  });
  const publishedRevision = publishedSnapshot?.revision ?? null;
  const versionRows = [
    {
      detail: isDirty ? 'Berbeda dari draf server' : 'Tidak ada perubahan lokal',
      label: 'Perubahan lokal',
      state: isDirty ? 'warning' : 'neutral',
    },
    {
      detail:
        readiness.invitation.state === 'published_with_unpublished_changes'
          ? 'Lebih baru dari versi tamu'
          : 'Versi privat terakhir',
      label: 'Draf tersimpan',
      state:
        readiness.invitation.state === 'published_with_unpublished_changes' ? 'warning' : 'neutral',
    },
    {
      detail: publishedRevision ? `Revisi ${publishedRevision}` : 'Belum pernah diterbitkan',
      label: 'Versi yang dilihat tamu',
      state: publishedRevision ? 'success' : 'neutral',
    },
  ] as const;

  return (
    <section
      aria-labelledby="invitation-studio-publish-title"
      className={styles.mode}
      data-invitation-studio-publish-mode="canonical"
      data-publish-decision={decision.kind}
    >
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Mode Terbitkan</p>
          <h2 className={styles.title} id="invitation-studio-publish-title">
            Apa yang perlu dilakukan agar versi ini tayang?
          </h2>
          <p className={styles.description}>
            Seraya memisahkan perubahan lokal, draf tersimpan, dan versi tamu supaya keputusan
            publikasi tidak pernah didasarkan pada status yang samar.
          </p>
        </div>
        <span className={styles.stateBadge} data-state={decision.kind}>
          {decision.label}
        </span>
      </header>

      <div className={styles.versionGrid} data-publish-version-truth>
        {versionRows.map((row) => (
          <article className={styles.versionCard} data-version-state={row.state} key={row.label}>
            <span>{row.label}</span>
            <strong>{row.detail}</strong>
          </article>
        ))}
      </div>

      <div className={styles.workspace}>
        <div className={styles.readinessCard}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>Kesiapan draf tersimpan</p>
              <h3>Periksa sumber penghambat sebelum menerbitkan.</h3>
            </div>
            <strong>
              {readyCount} dari {chapters.length} bab siap
            </strong>
          </div>

          <ol className={styles.chapterGrid}>
            {chapters.map((chapter) => {
              const needsAttention = chapter.status === 'error' || chapter.status === 'incomplete';
              const content = (
                <>
                  <span
                    className={styles.chapterIcon}
                    data-status={chapter.status}
                    aria-hidden="true"
                  >
                    {chapter.status === 'complete'
                      ? '✓'
                      : chapter.status === 'error'
                        ? '!'
                        : chapter.status === 'optional_off'
                          ? '–'
                          : '○'}
                  </span>
                  <span>
                    <strong>
                      {chapter.number} · {chapter.studioLabel}
                    </strong>
                    <small>
                      {readinessStatusCopy[chapter.status]}
                      {chapter.optional ? ' · Opsional' : ' · Wajib'}
                    </small>
                  </span>
                </>
              );

              return (
                <li key={chapter.key}>
                  {needsAttention ? (
                    <Link
                      className={styles.chapterLink}
                      href={getInvitationChapterHref(projectId, chapter.key)}
                      prefetch={false}
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className={styles.chapterItem}>{content}</div>
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        <aside className={styles.decisionCard} data-primary-publication-decision>
          <p className={styles.eyebrow}>Keputusan utama</p>
          <h3>{decision.title}</h3>
          <p>{decision.description}</p>

          <div className={styles.decisionAction}>
            {decision.kind === 'save-local' ? (
              <div className={styles.headerSaveHandoff} data-publish-header-save-handoff>
                Tombol <strong>Simpan perubahan</strong> tetap berada di header Studio sebagai satu
                save authority.
              </div>
            ) : decision.kind === 'fix-readiness' && firstBlocker ? (
              <Link
                className={styles.primaryLink}
                href={getInvitationChapterHref(projectId, firstBlocker.key)}
              >
                Lengkapi {firstBlocker.studioLabel}
              </Link>
            ) : decision.kind === 'activate-payment' ? (
              <Link className={styles.primaryLink} href={`/dashboard/${projectId}/billing`}>
                Selesaikan pembayaran
              </Link>
            ) : decision.kind === 'publish-first' || decision.kind === 'republish' ? (
              <PublishInvitationControls
                hasActiveDraft
                intent={decision.kind === 'republish' ? 'republish' : 'initial'}
                presentation="readiness"
                projectId={projectId}
                publishedSlug={readiness.invitation.publishedSlug}
                publishEligibility={paymentOverview.publishEligibility}
              />
            ) : readiness.invitation.publishedSlug ? (
              <Link
                className={styles.primaryLink}
                href={`/${readiness.invitation.publishedSlug}`}
                rel="noreferrer"
                target="_blank"
              >
                Buka undangan terbit
              </Link>
            ) : null}
          </div>

          <div className={styles.guestImpact}>
            <strong>Dampak pada undangan tamu</strong>
            <p>
              Republish memperbarui konten pada link aktif. Link tamu dan guest token tidak dibuat
              ulang. Seraya tidak menyatakan undangan sudah dikirim, dibuka, atau dibaca.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
