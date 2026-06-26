/* eslint-disable @next/next/no-img-element -- Laras receives only Seraya media proxy URLs. */
import { DigitalGiftCopyButton } from '../digital-gift-copy-button';
import type { InvitationTemplateProps } from '../invitation-template.types';

import styles from './laras.module.css';

function Person({
  person,
}: {
  person: InvitationTemplateProps['invitation']['couple']['personOne'];
}) {
  return (
    <article className={styles.person}>
      <h3>{person.displayName}</h3>
      {person.fullName ? <p className={styles.personFullName}>{person.fullName}</p> : null}
      {person.parentLine ? <p className={styles.personParent}>{person.parentLine}</p> : null}
    </article>
  );
}

function EventScheduleBlock({
  event,
  sequence,
}: {
  event: NonNullable<InvitationTemplateProps['invitation']['events']>['items'][number];
  sequence: number;
}) {
  return (
    <article className={styles.eventCard} data-schedule-event="laras">
      <span className={styles.eventLabel}>{String(sequence).padStart(2, '0')}</span>
      {event.title ? <h3>{event.title}</h3> : null}
      {event.dateLabel ? <p>{event.dateLabel}</p> : null}
      {event.timeLabel ? <p>{event.timeLabel}</p> : null}
      {event.venueName ? <p className={styles.eventVenue}>{event.venueName}</p> : null}
      {event.address ? <p className={styles.eventAddress}>{event.address}</p> : null}
      {event.mapsHref ? (
        <a
          className={styles.mapsLink}
          href={event.mapsHref}
          rel="noopener noreferrer"
          target="_blank"
        >
          Buka peta acara (tab baru)
        </a>
      ) : null}
    </article>
  );
}

/** Deep formal evening invitation composition. */
export function LarasTemplate({ invitation }: InvitationTemplateProps) {
  return (
    <article
      aria-labelledby="laras-invitation-title"
      className={styles.invitation}
      data-template="laras"
    >
      <header className={styles.hero}>
        <span className={styles.cornerTop} aria-hidden="true" />
        <span className={styles.cornerBottom} aria-hidden="true" />
        <p className={styles.eyebrow}>{invitation.hero.eyebrow ?? 'The Wedding Of'}</p>
        <div className={styles.monogram} aria-hidden="true">
          L
        </div>
        <h1 id="laras-invitation-title">{invitation.hero.title}</h1>
        {invitation.hero.subtitle ? (
          <p className={styles.heroSubtitle}>{invitation.hero.subtitle}</p>
        ) : null}
        {invitation.hero.primaryDateLabel ? (
          <p className={styles.heroDate}>{invitation.hero.primaryDateLabel}</p>
        ) : null}
      </header>

      <div className={styles.content}>
        <section aria-labelledby="laras-couple-title" className={styles.coupleSection}>
          <p className={styles.sectionLabel}>Kami yang berbahagia</p>
          <h2 id="laras-couple-title">Merayakan awal yang baru</h2>
          <div className={styles.coupleGrid}>
            <Person person={invitation.couple.personOne} />
            <span className={styles.ampersand} aria-hidden="true">
              &amp;
            </span>
            <Person person={invitation.couple.personTwo} />
          </div>
        </section>

        {invitation.story ? (
          <section aria-labelledby="laras-story-title" className={styles.storySection}>
            <p className={styles.sectionLabel}>Catatan kecil</p>
            <h2 id="laras-story-title">{invitation.story.heading ?? 'Cerita kami'}</h2>
            {invitation.story.body ? <p className={styles.prose}>{invitation.story.body}</p> : null}
          </section>
        ) : null}

        {invitation.events ? (
          <section aria-labelledby="laras-events-title" className={styles.eventsSection}>
            <div className={styles.eventsHeading}>
              <p className={styles.sectionLabel}>Rangkaian acara</p>
              <h2 id="laras-events-title">Malam yang kami nantikan</h2>
              {invitation.events.primaryDateLabel ? (
                <p className={styles.primaryDate}>{invitation.events.primaryDateLabel}</p>
              ) : null}
            </div>
            {invitation.events.items.length > 0 ? (
              <div className={styles.eventsGrid}>
                {invitation.events.items.map((event, index) => (
                  <EventScheduleBlock
                    event={event}
                    key={`${event.title ?? 'acara'}-${index}`}
                    sequence={index + 1}
                  />
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {invitation.location ? (
          <section aria-labelledby="laras-location-title" className={styles.locationSection}>
            <p className={styles.sectionLabel}>Lokasi</p>
            <h2 id="laras-location-title">Tempat perayaan kami</h2>
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
                rel="noopener noreferrer"
                target="_blank"
              >
                Buka peta lokasi (tab baru)
              </a>
            ) : null}
          </section>
        ) : null}

        {invitation.gallery ? (
          <section aria-labelledby="laras-gallery-title" className={styles.gallerySection}>
            <p className={styles.sectionLabel}>Galeri</p>
            <h2 id="laras-gallery-title">Momen yang kami pilih</h2>
            <div className={styles.galleryGrid}>
              {invitation.gallery.images.map((image) => (
                <figure className={styles.galleryFigure} key={image.id}>
                  <img
                    alt={image.alt}
                    className={styles.galleryImage}
                    loading="lazy"
                    src={image.src}
                  />
                </figure>
              ))}
            </div>
          </section>
        ) : null}

        {invitation.rsvp ? (
          <section aria-labelledby="laras-rsvp-title" className={styles.rsvpSection}>
            <p className={styles.sectionLabel}>RSVP</p>
            <h2 id="laras-rsvp-title">{invitation.rsvp.heading}</h2>
            <p className={styles.prose}>{invitation.rsvp.lead}</p>
          </section>
        ) : null}

        {invitation.digitalGift ? (
          <section aria-labelledby="laras-digital-gift-title" className={styles.digitalGiftSection}>
            <div className={styles.digitalGiftHeading}>
              <p className={styles.sectionLabel}>Amplop Digital</p>
              <h2 id="laras-digital-gift-title">{invitation.digitalGift.heading}</h2>
              {invitation.digitalGift.lead ? (
                <p className={styles.prose}>{invitation.digitalGift.lead}</p>
              ) : null}
            </div>
            <div className={styles.digitalGiftGrid}>
              {invitation.digitalGift.accounts.map((account) => (
                <article className={styles.digitalGiftCard} key={account.id}>
                  <span className={styles.digitalGiftFrame} aria-hidden="true" />
                  <p className={styles.digitalGiftProvider}>{account.providerName}</p>
                  <h3>{account.accountHolder}</h3>
                  <p className={styles.digitalGiftNumber}>{account.accountNumber}</p>
                  <DigitalGiftCopyButton
                    accountNumber={account.accountNumber}
                    className={styles.digitalGiftCopyButton}
                    feedbackClassName={styles.digitalGiftFeedback}
                  />
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {invitation.closing ? (
          <section aria-labelledby="laras-closing-title" className={styles.closingSection}>
            <span className={styles.closingMark} aria-hidden="true">
              ✦
            </span>
            <h2 id="laras-closing-title">Terima kasih atas doa terbaik Anda</h2>
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
