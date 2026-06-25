/* eslint-disable @next/next/no-img-element -- Aruna receives only Seraya media proxy URLs. */
import type { InvitationTemplateProps } from '../invitation-template.types';

import styles from './aruna.module.css';

function Person({
  person,
}: {
  person: InvitationTemplateProps['invitation']['couple']['personOne'];
}) {
  return (
    <article className={styles.person}>
      <p className={styles.personLabel}>Mempelai</p>
      <h3 className={styles.personName}>{person.displayName}</h3>
      {person.fullName ? <p className={styles.personFullName}>{person.fullName}</p> : null}
      {person.parentLine ? <p className={styles.personParent}>{person.parentLine}</p> : null}
    </article>
  );
}

function EventPart({
  event,
}: {
  event: NonNullable<InvitationTemplateProps['invitation']['events']>['ceremony'];
}) {
  if (!event) {
    return null;
  }

  return (
    <article className={styles.eventCard}>
      <span className={styles.eventRule} aria-hidden="true" />
      {event.title ? <h3>{event.title}</h3> : null}
      {event.dateLabel ? <p>{event.dateLabel}</p> : null}
      {event.timeLabel ? <p>{event.timeLabel}</p> : null}
    </article>
  );
}

/** Bright editorial romantic invitation composition. */
export function ArunaTemplate({ invitation }: InvitationTemplateProps) {
  return (
    <article
      aria-labelledby="aruna-invitation-title"
      className={styles.invitation}
      data-template="aruna"
    >
      <header className={styles.hero}>
        <div className={styles.heroRule} aria-hidden="true" />
        <div className={styles.heroContent}>
          <p className={styles.kicker}>{invitation.hero.eyebrow ?? 'The Wedding Of'}</p>
          <h1 id="aruna-invitation-title">{invitation.hero.title}</h1>
          {invitation.hero.subtitle ? (
            <p className={styles.heroSubtitle}>{invitation.hero.subtitle}</p>
          ) : null}
        </div>
        <div className={styles.heroDateWrap}>
          <span className={styles.heroDateLabel}>Save the date</span>
          <span className={styles.heroDate}>
            {invitation.hero.primaryDateLabel ?? 'Hari bahagia kami'}
          </span>
        </div>
      </header>

      <div className={styles.content}>
        <section aria-labelledby="aruna-couple-title" className={styles.coupleSection}>
          <div className={styles.sectionHeading}>
            <p>Perayaan cinta</p>
            <h2 id="aruna-couple-title">Dengan sukacita kami mengundang Anda</h2>
          </div>
          <div className={styles.coupleGrid}>
            <Person person={invitation.couple.personOne} />
            <span className={styles.ampersand} aria-hidden="true">
              &amp;
            </span>
            <Person person={invitation.couple.personTwo} />
          </div>
        </section>

        {invitation.story ? (
          <section aria-labelledby="aruna-story-title" className={styles.storySection}>
            <p className={styles.sectionKicker}>Cerita kami</p>
            <h2 id="aruna-story-title">{invitation.story.heading ?? 'Cerita kami'}</h2>
            {invitation.story.body ? <p className={styles.prose}>{invitation.story.body}</p> : null}
          </section>
        ) : null}

        {invitation.events ? (
          <section aria-labelledby="aruna-events-title" className={styles.eventsSection}>
            <div className={styles.sectionHeading}>
              <p>Detail acara</p>
              <h2 id="aruna-events-title">Hari yang kami nantikan</h2>
              {invitation.events.primaryDateLabel ? (
                <span className={styles.primaryDate}>{invitation.events.primaryDateLabel}</span>
              ) : null}
            </div>
            {invitation.events.ceremony || invitation.events.reception ? (
              <div className={styles.eventsGrid}>
                <EventPart event={invitation.events.ceremony} />
                <EventPart event={invitation.events.reception} />
              </div>
            ) : null}
          </section>
        ) : null}

        {invitation.location ? (
          <section aria-labelledby="aruna-location-title" className={styles.locationSection}>
            <p className={styles.sectionKicker}>Lokasi</p>
            <h2 id="aruna-location-title">Mari bertemu di sini</h2>
            {invitation.location.venueName ? (
              <p className={styles.locationVenue}>{invitation.location.venueName}</p>
            ) : null}
            {invitation.location.address ? (
              <p className={styles.prose}>{invitation.location.address}</p>
            ) : null}
            {invitation.location.mapsHref ? (
              <a
                className={styles.mapsLink}
                href={invitation.location.mapsHref}
                rel="noreferrer"
                target="_blank"
              >
                Buka peta lokasi (tab baru)
              </a>
            ) : null}
          </section>
        ) : null}

        {invitation.gallery ? (
          <section aria-labelledby="aruna-gallery-title" className={styles.gallerySection}>
            <div className={styles.sectionHeading}>
              <p>Galeri</p>
              <h2 id="aruna-gallery-title">Fragmen yang kami simpan</h2>
            </div>
            <div className={styles.galleryGrid}>
              {invitation.gallery.images.map((image, index) => (
                <figure className={styles.galleryFigure} key={image.id}>
                  <img
                    alt={image.alt}
                    className={styles.galleryImage}
                    loading="lazy"
                    src={image.src}
                  />
                  <figcaption aria-hidden="true">{String(index + 1).padStart(2, '0')}</figcaption>
                </figure>
              ))}
            </div>
          </section>
        ) : null}

        {invitation.rsvp ? (
          <section aria-labelledby="aruna-rsvp-title" className={styles.rsvpSection}>
            <p className={styles.sectionKicker}>RSVP</p>
            <h2 id="aruna-rsvp-title">{invitation.rsvp.heading}</h2>
            <p className={styles.prose}>{invitation.rsvp.lead}</p>
          </section>
        ) : null}

        {invitation.closing ? (
          <section aria-labelledby="aruna-closing-title" className={styles.closingSection}>
            <div className={styles.closingRule} aria-hidden="true" />
            <h2 id="aruna-closing-title">Sampai jumpa di hari bahagia kami</h2>
            {invitation.closing.message ? (
              <p className={styles.prose}>{invitation.closing.message}</p>
            ) : null}
            {invitation.closing.signature ? (
              <p className={styles.signature}>{invitation.closing.signature}</p>
            ) : null}
          </section>
        ) : null}
      </div>
    </article>
  );
}
