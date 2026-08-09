import Link from 'next/link';

import { deriveProjectCompassNextStep, type WeddingReadinessV1 } from '@/modules/readiness';

import styles from './project-overview-bootstrap.module.css';

type ProjectOverviewBootstrapProps = { projectId: string; readiness: WeddingReadinessV1 };

function getInvitationStatus(readiness: WeddingReadinessV1) {
  switch (readiness.invitation.state) {
    case 'published':
      return { label: 'Terbit & sinkron', tone: 'success' as const };
    case 'published_with_unpublished_changes':
      return { label: 'Ada perubahan draf', tone: 'warning' as const };
    case 'ready_to_publish':
      return { label: 'Siap diterbitkan', tone: 'brand' as const };
    case 'draft_ready_unactivated':
      return { label: 'Menunggu aktivasi', tone: 'brand' as const };
    case 'draft_incomplete':
      return { label: 'Draf belum lengkap', tone: 'warning' as const };
  }
}

export function ProjectOverviewBootstrap({ projectId, readiness }: ProjectOverviewBootstrapProps) {
  const status = getInvitationStatus(readiness);
  const priority = deriveProjectCompassNextStep(readiness, projectId);
  const responseCount = readiness.responses.nonPendingRsvpCount;
  const readyToDistributeCount = readiness.guests.readyToDistributeCount ?? 0;

  return (
    <section
      aria-labelledby="owner-workspace-start-title"
      className={styles.workspace}
      data-owner-dashboard-cognitive-compression="v1"
      data-owner-post-publish-operations="v1"
      data-owner-workspace-editorial-dashboard="v3"
    >
      <header className={styles.pageHead}>
        <p className={styles.eyebrow}>Ringkasan proyek</p>
        <h1 className={styles.title} id="owner-workspace-start-title">
          Selamat datang kembali, {readiness.identity.coupleLabel}
        </h1>
        <p className={styles.description}>
          Fokus pada satu langkah berikutnya. Status lain tetap tersedia sebagai ringkasan singkat.
        </p>
      </header>

      <section aria-labelledby="owner-priority-title" className={styles.priorityPanel}>
        <div className={styles.priorityCopy}>
          <p className={styles.priorityEyebrow}>Prioritas sekarang</p>
          <h2 id="owner-priority-title">{priority.label}</h2>
          <p>{priority.description}</p>
        </div>
        <Link className={styles.priorityAction} data-owner-priority-action href={priority.href}>
          Kerjakan sekarang <span aria-hidden="true">→</span>
        </Link>
      </section>

      <div className={styles.statGrid} aria-label="Ringkasan kondisi proyek">
        <article className={styles.statCard}>
          <span className={styles.statLabel}>Status undangan</span>
          <strong className={styles.statusValue} data-status-tone={status.tone}>
            {status.label}
          </strong>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>Tamu aktif</span>
          <strong className={styles.statValue}>
            {readiness.guests.activeGuestCount} <small>tamu</small>
          </strong>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>Respons masuk</span>
          <strong className={styles.statValue}>
            {responseCount} <small>RSVP</small>
          </strong>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>Siap dibagikan</span>
          <strong className={styles.statValue}>
            {readyToDistributeCount} <small>tamu</small>
          </strong>
        </article>
      </div>
    </section>
  );
}
