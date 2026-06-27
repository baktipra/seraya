/* eslint-disable @next/next/no-img-element -- Aruna receives only Seraya media proxy URLs. */
import { DigitalGiftCopyButton } from '../digital-gift-copy-button';
import {
  getPersonalInvitationPresentationSlots,
  type InvitationTemplateProps,
} from '../invitation-template.types';

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

function EventScheduleBlock({
  event,
  sequence,
}: {
  event: NonNullable<InvitationTemplateProps['invitation']['events']>['items'][number];
  sequence: number;
}) {
  return (
    <article className={styles.eventCard} data-schedule-event="aruna">
      <span className={styles.eventRule} aria-hidden="true" />
      <span className={styles.eventSequence}>{String(sequence).padStart(2, '0')}</span>
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

/** Bright editorial romantic invitation composition. */
export function ArunaTemplate({ invitation, renderContext }: InvitationTemplateProps) {
  const personalSlots = getPersonalInvitationPresentationSlots(renderContext);

  return (
    <>
      {personalSlots?.greeting}
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
              {invitation.story.body ? (
                <p className={styles.prose}>{invitation.story.body}</p>
              ) : null}
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
                  rel="noopener noreferrer"
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

          {invitation.digitalGift ? (
            <section
              aria-labelledby="aruna-digital-gift-title"
              className={styles.digitalGiftSection}
            >
              <div className={styles.digitalGiftHeading}>
                <p>Amplop Digital</p>
                <h2 id="aruna-digital-gift-title">{invitation.digitalGift.heading}</h2>
                {invitation.digitalGift.lead ? (
                  <p className={styles.prose}>{invitation.digitalGift.lead}</p>
                ) : null}
              </div>
              <div className={styles.digitalGiftGrid}>
                {invitation.digitalGift.accounts.map((account, index) => (
                  <article className={styles.digitalGiftCard} key={account.id}>
                    <span className={styles.digitalGiftIndex} aria-hidden="true">
                      {String(index + 1).padStart(2, '0')}
                    </span>
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
      {personalSlots?.rsvp}
      {personalSlots?.guestbook}
    </>
  );
}
