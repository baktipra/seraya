import type { Route } from 'next';
import Link from 'next/link';

import { CanonicalInvitationThumbnail } from '@/components/marketing/canonical-invitation-thumbnail';
import { featuredThemes } from '@/components/marketing/theme-catalog';
import type { WeddingReadinessV1 } from '@/modules/readiness';

import { GuestRosterVisual, ResponseFlowVisual } from './owner-workspace-visuals';
import styles from './project-overview-bootstrap.module.css';

type ProjectOverviewBootstrapProps = { projectId: string; readiness: WeddingReadinessV1 };

function getInvitationStatus(readiness: WeddingReadinessV1) {
  switch (readiness.invitation.state) {
    case 'published':
      return { label: 'Undangan terbit', tone: 'success' as const };
    case 'published_with_unpublished_changes':
      return { label: 'Ada perubahan belum terbit', tone: 'warning' as const };
    case 'ready_to_publish':
      return { label: 'Siap diterbitkan', tone: 'brand' as const };
    case 'draft_ready_unactivated':
      return { label: 'Menunggu aktivasi', tone: 'brand' as const };
    case 'draft_incomplete':
      return { label: 'Masih draf', tone: 'brand' as const };
  }
}

export function ProjectOverviewBootstrap({ projectId, readiness }: ProjectOverviewBootstrapProps) {
  const base = `/dashboard/${projectId}`;
  const invitationHref = `${base}/invitation` as Route;
  const guestsHref = `${base}/guests` as Route;
  const responsesHref = `${base}/rsvp` as Route;
  const deliveryHref = `${base}/delivery` as Route;
  const status = getInvitationStatus(readiness);
  const selectedTheme =
    featuredThemes.find((theme) => theme.key === readiness.identity.templateKey) ??
    featuredThemes[0]!;
  const selectedPalette = selectedTheme.palettes[0]!;
  const activeGuestCount = readiness.guests.activeGuestCount;
  const responseCount = readiness.responses.nonPendingRsvpCount;
  const readyToDistributeCount = readiness.guests.readyToDistributeCount ?? 0;

  return (
    <section
      aria-labelledby="owner-workspace-start-title"
      className={styles.workspace}
      data-owner-workspace-radical-simplicity="v2"
    >
      <header className={styles.header}>
        <div className={styles.headerCopy}>
          <p className={styles.eyebrow}>{readiness.identity.coupleLabel}</p>
          <h1 className={styles.title} id="owner-workspace-start-title">
            Mau mengerjakan apa sekarang?
          </h1>
          <p className={styles.description}>
            Pilih satu pekerjaan. Seraya akan membawa kalian langsung ke tempat yang dibutuhkan—tanpa
            harus memahami struktur dashboard.
          </p>
        </div>
        <span className={styles.status} data-status-tone={status.tone}>
          <span aria-hidden="true" />
          {status.label}
        </span>
      </header>

      <div className={styles.entryGrid}>
        <Link className={`${styles.entry} ${styles.invitationEntry}`} href={invitationHref}>
          <span className={styles.invitationCopy}>
            <span className={styles.entryKicker}>Mulai di sini</span>
            <span className={styles.entryTitle}>Edit undangan</span>
            <span className={styles.entryDescription}>
              Lengkapi isi, pilih tampilan, atur foto dan musik, lalu periksa hasilnya.
            </span>
            <span className={styles.entryMeta}>
              <span>{selectedTheme.name}</span>
              <span>{status.label}</span>
            </span>
            <span className={styles.entryAction}>
              Buka editor <span aria-hidden="true">→</span>
            </span>
          </span>
          <span className={styles.thumbnailStage}>
            <CanonicalInvitationThumbnail
              className={styles.thumbnail}
              paletteCanvas={selectedPalette.canvas}
              paletteKey={selectedPalette.key}
              paletteName={selectedPalette.name}
              priority
              templateKey={selectedTheme.key}
              variant="showcase"
            />
          </span>
        </Link>

        <Link className={`${styles.entry} ${styles.guestsEntry}`} href={guestsHref}>
          <span className={styles.secondaryCopy}>
            <span className={styles.entryKicker}>Tamu & pembagian</span>
            <span className={styles.secondaryTitle}>Kelola tamu</span>
            <span className={styles.secondaryDescription}>
              Tambah nama, siapkan tautan personal, lalu bagikan dari satu alur.
            </span>
            <span className={styles.entryAction}>
              Buka daftar tamu <span aria-hidden="true">→</span>
            </span>
          </span>
          <GuestRosterVisual className={styles.operationalVisual} />
        </Link>

        <Link className={`${styles.entry} ${styles.responsesEntry}`} href={responsesHref}>
          <span className={styles.secondaryCopy}>
            <span className={styles.entryKicker}>RSVP & ucapan</span>
            <span className={styles.secondaryTitle}>Lihat respons</span>
            <span className={styles.secondaryDescription}>
              Pantau siapa yang hadir, belum menjawab, dan ucapan yang masuk.
            </span>
            <span className={styles.entryAction}>
              Buka respons <span aria-hidden="true">→</span>
            </span>
          </span>
          <ResponseFlowVisual className={styles.operationalVisual} />
        </Link>
      </div>

      <div className={styles.summaryLine}>
        <div className={styles.summaryFacts} aria-label="Ringkasan proyek">
          <span>
            <strong>{activeGuestCount}</strong> tamu aktif
          </span>
          <span>
            <strong>{readyToDistributeCount}</strong> siap dibagikan
          </span>
          <span>
            <strong>{responseCount}</strong> respons masuk
          </span>
        </div>
        {activeGuestCount > 0 ? (
          <Link className={styles.deliveryLink} href={deliveryHref}>
            Siapkan pembagian <span aria-hidden="true">→</span>
          </Link>
        ) : null}
      </div>
    </section>
  );
}
