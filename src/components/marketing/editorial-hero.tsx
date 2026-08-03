import Image from 'next/image';
import Link from 'next/link';

import styles from './editorial-hero.module.css';

export function EditorialHero() {
  return (
    <section
      className={styles.hero}
      data-homepage-campaign-hero
      data-homepage-editorial-hero
    >
      <div className={styles.frame}>
        <Image
          alt=""
          aria-hidden="true"
          className={styles.backdrop}
          fill
          priority
          sizes="(min-width: 1536px) 1536px, 100vw"
          src="/showroom/kirana-arga/kirana-arga-opening-portrait.avif"
        />
        <div aria-hidden="true" className={styles.backdropWash} />

        <figure
          aria-label="Visual editorial undangan Roselle untuk Kirana dan Arga di atas bidang fotografis pernikahan bernuansa lembut."
          className={styles.productPanel}
          data-editorial-hero-theater
          role="img"
        >
          <div aria-hidden="true" className={styles.productPhoto}>
            <Image
              alt=""
              className={styles.productPhotoImage}
              fill
              priority
              sizes="(min-width: 1024px) 46vw, 100vw"
              src="/showroom/kirana-arga/kirana-arga-opening-portrait.avif"
            />
            <div className={styles.productPhotoWash} />
          </div>

          <div aria-hidden="true" className={styles.invitationSheet}>
            <p className={styles.invitationEyebrow}>The wedding of</p>
            <p className={styles.invitationNames}>
              Kirana <span>&amp;</span> Arga
            </p>
            <div className={styles.invitationRule} />
            <p className={styles.invitationDate}>17 Agustus 2027</p>
            <p className={styles.invitationPlace}>Jakarta · Indonesia</p>
          </div>

          <figcaption className={styles.productCaption}>Roselle · personal invitation</figcaption>
        </figure>

        <div className={styles.copy}>
          <p className={styles.eyebrow}>Undangan pernikahan digital</p>
          <h1 className={styles.title}>Undangan pernikahan yang terasa personal</h1>
          <p className={styles.lead}>
            Keindahan stationery klasik dengan kemudahan digital. Bagikan undangan secara personal,
            kelola RSVP, dan sambut hari pernikahan dengan lebih tenang.
          </p>
          <Link className={styles.primaryAction} href="/templates">
            Jelajahi koleksi
          </Link>
        </div>
      </div>
    </section>
  );
}
