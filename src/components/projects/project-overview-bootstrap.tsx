import type { Route } from 'next';
import Link from 'next/link';

import type { WeddingReadinessV1 } from '@/modules/readiness';

import styles from './project-overview-bootstrap.module.css';

type ProjectOverviewBootstrapProps = { projectId: string; readiness: WeddingReadinessV1 };

type JourneyState = 'current' | 'done' | 'pending';

type JourneyStep = {
  description: string;
  label: string;
  state: JourneyState;
};

type NextStep = {
  description: string;
  done: boolean;
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

function getJourney(readiness: WeddingReadinessV1): JourneyStep[] {
  const contentReady = readiness.invitation.state !== 'draft_incomplete';
  const published = readiness.invitation.hasPublishedSnapshot;
  const hasGuests = readiness.guests.activeGuestCount > 0;
  const hasResponses = readiness.responses.nonPendingRsvpCount > 0;

  return [
    { description: 'Identitas proyek sudah dibuat dan siap dikelola.', label: 'Buat proyek', state: 'done' },
    { description: `${readiness.identity.templateKey} menjadi tampilan aktif saat ini.`, label: 'Pilih tema', state: 'done' },
    {
      description: contentReady ? 'Isi utama undangan sudah melewati kesiapan dasar.' : 'Lengkapi bagian yang masih perlu perhatian di editor.',
      label: 'Lengkapi konten',
      state: contentReady ? 'done' : 'current',
    },
    {
      description: published
        ? readiness.invitation.hasUnpublishedChanges
          ? 'Versi tamu aktif, tetapi ada perubahan baru yang belum diterbitkan.'
          : 'Versi tamu aktif dan sinkron dengan draf terakhir.'
        : 'Terbitkan setelah isi dan aktivasi siap.',
      label: 'Terbitkan',
      state: published ? 'done' : contentReady ? 'current' : 'pending',
    },
    {
      description: hasResponses
        ? `${readiness.responses.nonPendingRsvpCount} respons sudah masuk.`
        : hasGuests
          ? 'Tamu sudah tersedia; lanjutkan pembagian dan pantau respons.'
          : 'Tambahkan tamu setelah undangan siap dibagikan.',
      label: 'Bagikan & pantau',
      state: published ? 'current' : 'pending',
    },
  ];
}

function getNextSteps(projectId: string, readiness: WeddingReadinessV1): NextStep[] {
  const base = `/dashboard/${projectId}`;
  const contentReady = readiness.invitation.state !== 'draft_incomplete';
  const published = readiness.invitation.hasPublishedSnapshot;
  const publishedSynced = published && !readiness.invitation.hasUnpublishedChanges;
  const hasGuests = readiness.guests.activeGuestCount > 0;
  const hasResponses = readiness.responses.nonPendingRsvpCount > 0;

  return [
    {
      description: contentReady ? 'Isi utama sudah melewati kesiapan dasar.' : 'Buka editor dan selesaikan bagian yang masih belum lengkap.',
      done: contentReady,
      href: `${base}/invitation` as Route,
      title: 'Lengkapi isi undangan',
    },
    {
      description: publishedSynced
        ? 'Draf dan versi yang dilihat tamu sudah sama.'
        : published
          ? 'Ada perubahan baru yang masih tersimpan sebagai draf privat.'
          : 'Versi tamu belum aktif sampai proses terbit selesai.',
      done: publishedSynced,
      href: `${base}/invitation?task=publish` as Route,
      title: published ? 'Sinkronkan versi tamu' : 'Terbitkan undangan',
    },
    {
      description: hasGuests ? `${readiness.guests.activeGuestCount} tamu aktif sudah tercatat.` : 'Tambahkan nama dan kapasitas tamu sebelum menyiapkan tautan personal.',
      done: hasGuests,
      href: `${base}/guests` as Route,
      title: 'Siapkan daftar tamu',
    },
    {
      description: hasResponses
        ? `${readiness.responses.nonPendingRsvpCount} respons sudah dapat dipantau.`
        : published
          ? 'Setelah tautan dibagikan, pantau RSVP dan ucapan dari satu tempat.'
          : 'Respons akan mulai relevan setelah undangan diterbitkan dan dibagikan.',
      done: hasResponses,
      href: `${base}/rsvp` as Route,
      title: 'Pantau respons tamu',
    },
  ];
}

export function ProjectOverviewBootstrap({ projectId, readiness }: ProjectOverviewBootstrapProps) {
  const status = getInvitationStatus(readiness);
  const journey = getJourney(readiness);
  const nextSteps = getNextSteps(projectId, readiness);
  const responseCount = readiness.responses.nonPendingRsvpCount;
  const readyToDistributeCount = readiness.guests.readyToDistributeCount ?? 0;

  return (
    <section aria-labelledby="owner-workspace-start-title" className={styles.workspace} data-owner-workspace-editorial-dashboard="v3">
      <header className={styles.pageHead}>
        <p className={styles.eyebrow}>Ringkasan proyek</p>
        <h1 className={styles.title} id="owner-workspace-start-title">Selamat datang kembali, {readiness.identity.coupleLabel}</h1>
        <p className={styles.description}>Begini kondisi undangan kalian saat ini. Ringkasan ini hanya menunjukkan hal yang paling berguna untuk menentukan langkah berikutnya.</p>
      </header>

      <div className={styles.statGrid} aria-label="Ringkasan kondisi proyek">
        <article className={styles.statCard}><span className={styles.statLabel}>Status undangan</span><strong className={styles.statusValue} data-status-tone={status.tone}>{status.label}</strong></article>
        <article className={styles.statCard}><span className={styles.statLabel}>Tamu aktif</span><strong className={styles.statValue}>{readiness.guests.activeGuestCount} <small>tamu</small></strong></article>
        <article className={styles.statCard}><span className={styles.statLabel}>Respons masuk</span><strong className={styles.statValue}>{responseCount} <small>RSVP</small></strong></article>
        <article className={styles.statCard}><span className={styles.statLabel}>Siap dibagikan</span><strong className={styles.statValue}>{readyToDistributeCount} <small>tamu</small></strong></article>
      </div>

      <section className={styles.panel} aria-labelledby="project-journey-title">
        <div className={styles.panelHead}><div><h2 id="project-journey-title">Perjalanan proyek</h2><p>Tahapan dari menyiapkan undangan sampai mengelola respons tamu.</p></div></div>
        <div className={styles.journey}>
          {journey.map((step, index) => (
            <div className={styles.journeyStep} data-state={step.state} key={step.label}>
              <span className={styles.journeyDot}>{step.state === 'done' ? '✓' : index + 1}</span>
              <strong>{step.label}</strong>
              <p>{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.panel} aria-labelledby="next-steps-title">
        <div className={styles.panelHead}><div><h2 id="next-steps-title">Langkah berikutnya</h2><p>Empat area ini merangkum pekerjaan yang paling relevan sekarang.</p></div></div>
        <div className={styles.todoList}>
          {nextSteps.map((step) => (
            <Link className={styles.todoRow} href={step.href} key={step.title}>
              <span className={styles.todoCheck} data-done={step.done || undefined}>{step.done ? '✓' : ''}</span>
              <span className={styles.todoCopy}><strong>{step.title}</strong><span>{step.description}</span></span>
              <span aria-hidden="true" className={styles.todoArrow}>→</span>
            </Link>
          ))}
        </div>
      </section>
    </section>
  );
}
