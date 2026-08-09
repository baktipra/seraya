import type { Route } from 'next';
import Link from 'next/link';

import type { WeddingReadinessV1 } from '@/modules/readiness';

import styles from './project-overview-bootstrap.module.css';

type ProjectOverviewBootstrapProps = { projectId: string; readiness: WeddingReadinessV1 };

type PriorityAction = {
  description: string;
  href: Route;
  title: string;
};

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

function getPriorityAction(
  projectId: string,
  readiness: WeddingReadinessV1,
): PriorityAction {
  const base = `/dashboard/${projectId}`;

  switch (readiness.invitation.state) {
    case 'draft_incomplete':
      return {
        description:
          'Selesaikan bagian yang masih belum lengkap sebelum memikirkan publikasi atau pembagian.',
        href: `${base}/invitation` as Route,
        title: 'Lengkapi isi undangan',
      };
    case 'draft_ready_unactivated':
      return {
        description: 'Isi utama sudah siap. Selesaikan aktivasi agar versi tamu dapat diterbitkan.',
        href: `${base}/invitation?task=publish` as Route,
        title: 'Aktifkan dan terbitkan undangan',
      };
    case 'ready_to_publish':
      return {
        description: 'Draf sudah melewati kesiapan dasar dan siap menjadi versi yang dilihat tamu.',
        href: `${base}/invitation?task=publish` as Route,
        title: 'Terbitkan undangan',
      };
    case 'published_with_unpublished_changes':
      return {
        description:
          'Tamu masih melihat versi terbit sebelumnya sampai perubahan terbaru diterbitkan ulang.',
        href: `${base}/invitation?task=publish` as Route,
        title: 'Terbitkan ulang perubahan',
      };
    case 'published': {
      if (readiness.guests.activeGuestCount === 0) {
        return {
          description:
            'Undangan sudah aktif. Langkah berikutnya adalah menyiapkan siapa yang akan menerimanya.',
          href: `${base}/guests` as Route,
          title: 'Tambahkan daftar tamu',
        };
      }

      if (readiness.responses.nonPendingRsvpCount > 0) {
        return {
          description: `${readiness.responses.nonPendingRsvpCount} respons sudah masuk dan siap dipantau dari satu tempat.`,
          href: `${base}/rsvp` as Route,
          title: 'Pantau respons tamu',
        };
      }

      const readyToDistributeCount = readiness.guests.readyToDistributeCount ?? 0;
      if (readyToDistributeCount > 0) {
        return {
          description: `${readyToDistributeCount} tamu sudah memiliki kesiapan dasar untuk dibagikan secara manual.`,
          href: `${base}/delivery` as Route,
          title: 'Bagikan ke tamu yang sudah siap',
        };
      }

      return {
        description: `${readiness.guests.activeGuestCount} tamu aktif belum siap dibagikan. Periksa data dan Undangan Pribadi mereka.`,
        href: `${base}/guests` as Route,
        title: 'Periksa kesiapan tamu',
      };
    }
  }
}

export function ProjectOverviewBootstrap({
  projectId,
  readiness,
}: ProjectOverviewBootstrapProps) {
  const status = getInvitationStatus(readiness);
  const priority = getPriorityAction(projectId, readiness);
  const responseCount = readiness.responses.nonPendingRsvpCount;
  const readyToDistributeCount = readiness.guests.readyToDistributeCount ?? 0;

  return (
    <section
      aria-labelledby="owner-workspace-start-title"
      className={styles.workspace}
      data-owner-dashboard-cognitive-compression="v1"
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
          <h2 id="owner-priority-title">{priority.title}</h2>
          <p>{priority.description}</p>
        </div>
        <Link
          className={styles.priorityAction}
          data-owner-priority-action
          href={priority.href}
        >
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
