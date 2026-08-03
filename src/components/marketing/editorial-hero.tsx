import Link from 'next/link';

import styles from './editorial-hero.module.css';

const proofSignals = ['Dirancang mobile-first', 'Tautan personal', 'RSVP keluarga'] as const;

const heroRail = [
  { href: '/#koleksi-roselle', label: 'Roselle' },
  { href: '/#koleksi-aruna', label: 'Aruna' },
  { href: '/#koleksi-laras', label: 'Laras' },
  { href: '/#cara-kerja', label: 'Cara kerja' },
  { href: '/#tautan-personal', label: 'Tautan personal' },
] as const;

export function EditorialHero() {
  return (
    <section className={styles.hero} data-homepage-editorial-hero>
      <div aria-hidden="true" className={styles.ambientGlow} />
      <div aria-hidden="true" className={styles.botanicalField} />

      <div className={styles.shell}>
        <figure
          aria-label="Komposisi stationery undangan Roselle untuk Kirana dan Arga, dengan amplop, sapaan personal untuk Bapak Aditya dan keluarga, serta konfirmasi hadir untuk dua tamu."
          className={styles.theater}
          data-editorial-hero-theater
          role="img"
        >
          <div aria-hidden="true" className={styles.theaterInner}>
            <div className={styles.sceneLabel}>
              <span>Seraya flagship</span>
              <span>Roselle · personal edition</span>
            </div>

            <div className={styles.stationeryBoard} />
            <div className={styles.envelope}>
              <div className={styles.envelopeLiner} />
            </div>

            <div className={styles.invitationCard}>
              <div className={styles.invitationPhoto} />
              <div className={styles.invitationWash} />
              <div className={styles.invitationContent}>
                <p className={styles.invitationEyebrow}>The wedding of</p>
                <p className={styles.invitationNames}>
                  Kirana
                  <span>&amp;</span>
                  Arga
                </p>
                <p className={styles.invitationCopy}>
                  Dengan penuh syukur, kami mengundang Anda untuk hadir dalam perayaan keluarga
                  kami.
                </p>
                <div className={styles.invitationDate}>
                  <span>17</span>
                  <p>Agustus 2027</p>
                </div>
              </div>
            </div>

            <div className={styles.personalCard} data-editorial-personal-card>
              <p className={styles.cardEyebrow}>Undangan personal untuk</p>
              <p className={styles.personalName}>Bapak Aditya &amp; Keluarga</p>
              <p className={styles.personalMeta}>Dengan hormat, kami menantikan kehadiran Anda.</p>
            </div>

            <div className={styles.responseCard}>
              <img
                alt=""
                className={styles.replyMark}
                src="/marketing/hero/seraya-reply-mark.svg"
              />
              <div>
                <p className={styles.cardEyebrow}>Konfirmasi kehadiran</p>
                <p className={styles.responseTitle}>Hadir · 2 tamu</p>
              </div>
            </div>

            <img alt="" className={styles.waxSeal} src="/marketing/hero/seraya-wax-monogram.svg" />
            <p className={styles.theaterCaption}>Tautan personal · RSVP keluarga</p>
          </div>
        </figure>

        <div className={styles.copy}>
          <p className={styles.eyebrow}>Undangan pernikahan personal</p>
          <h1 className={styles.title}>
            Satu undangan yang indah.
            <span>Personal untuk setiap tamu.</span>
          </h1>
          <p className={styles.lead}>
            Susun undangan, bagikan tautan personal, dan kelola respons tamu dalam satu pengalaman
            yang tenang—dari kabar pertama sampai hari pernikahan.
          </p>

          <div className={styles.actions}>
            <Link className={styles.primaryAction} href="/dashboard/new">
              Mulai buat undangan
              <span aria-hidden="true">→</span>
            </Link>
            <Link className={styles.secondaryAction} href="/templates">
              Lihat koleksi desain
            </Link>
          </div>

          <ul aria-label="Keunggulan utama Seraya" className={styles.proofs}>
            {proofSignals.map((signal) => (
              <li key={signal}>{signal}</li>
            ))}
          </ul>
        </div>
      </div>

      <nav aria-label="Jelajahi homepage Seraya" className={styles.rail}>
        <div className={styles.railTrack}>
          {heroRail.map((item, index) => (
            <Link
              className={`${styles.railLink} ${index === 0 ? styles.railLinkActive : ''}`}
              href={item.href}
              key={item.href}
            >
              <span>{String(index + 1).padStart(2, '0')}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </section>
  );
}
