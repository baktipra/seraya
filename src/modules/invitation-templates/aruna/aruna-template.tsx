import { DigitalGiftCopyButton } from '../digital-gift-copy-button';
import { InvitationGalleryImage } from '../invitation-gallery-image';
import {
  getPersonalInvitationPresentationSlots,
  type InvitationTemplateProps,
} from '../core/theme-renderer.types';

import styles from './aruna.module.css';
import experienceStyles from './aruna-guest-experience.module.css';

function Person({
  person,
  sequence,
}: {
  person: InvitationTemplateProps['invitation']['couple']['personOne'];
  sequence: number;
}) {
  return (
    <article
      className={styles.person}
      data-aruna-profile
      data-profile-sequence={String(sequence).padStart(2, '0')}
    >
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
    <article
      className={styles.eventCard}
      data-agenda-sequence={String(sequence).padStart(2, '0')}
      data-aruna-agenda-entry
      data-schedule-event="aruna"
    >
      <span className={styles.eventRule} aria-hidden="true" />
      <span className={styles.eventSequence}>{String(sequence).padStart(2, '0')}</span>
      {event.title ? <h3>{event.title}</h3> : null}
      {event.dateLabel ? <p>{event.dateLabel}</p> : null}
      {event.timeLabel ? <p>{event.timeLabel}</p> : null}
      {event.venueName ? <p className={styles.eventVenue}>{event.venueName}</p> : null}
      {event.address ? <p className={styles.eventAddress}>{event.address}</p> : null}
      {event.mapsHref ? (
        <a
          aria-label={`Buka peta${event.title ? ` ${event.title}` : ' acara'} di tab baru`}
          className={styles.mapsLink}
          href={event.mapsHref}
          rel="noopener noreferrer"
          target="_blank"
        >
          Buka peta
        </a>
      ) : null}
    </article>
  );
}

/** Bright editorial romantic invitation composition. */
export function ArunaTemplate({ invitation, renderContext }: InvitationTemplateProps) {
  const personalSlots = getPersonalInvitationPresentationSlots(renderContext);
  const hasPersonalResponse = Boolean(personalSlots?.rsvp || personalSlots?.guestbook);
  const showGenericResponseNote = renderContext.surface !== 'personal';
  const genericResponseCopy = invitation.rsvp
    ? 'Konfirmasi kehadiran dan ucapan dapat dikirim melalui undangan pribadi dari pasangan.'
    : 'Ucapan dapat dikirim melalui undangan pribadi dari pasangan.';
  const personalResponseLead = personalSlots?.rsvp
    ? personalSlots.guestbook
      ? 'Konfirmasikan kehadiran dan titipkan ucapan untuk pasangan.'
      : 'Konfirmasikan kehadiran Anda untuk membantu pasangan mempersiapkan perayaan.'
    : 'Titipkan doa dan ucapan terbaik Anda untuk pasangan.';
  const openingTargetId = personalSlots?.greeting
    ? 'aruna-personal-greeting'
    : 'aruna-couple-title';
  const hasScheduleJourney = Boolean(invitation.events || invitation.location);

  return (
    <article
      aria-labelledby="aruna-invitation-title"
      className={`${styles.invitation} ${experienceStyles.experience}`}
      data-aruna-experience="journal-v1"
      data-surface={renderContext.surface}
      data-template="aruna"
    >
      <header className={styles.hero} data-aruna-journal-cover data-invitation-chapter="opening">
        <div className={styles.heroRule} data-aruna-cover-rule aria-hidden="true" />
        <div className={styles.heroContent} data-aruna-cover-story>
          <p className={styles.kicker} data-aruna-cover-masthead>
            {invitation.hero.eyebrow ?? 'The Wedding Of'}
          </p>
          <h1 id="aruna-invitation-title">{invitation.hero.title}</h1>
          {invitation.hero.subtitle ? (
            <p className={styles.heroSubtitle}>{invitation.hero.subtitle}</p>
          ) : null}
        </div>
        <div className={styles.heroDateWrap} data-aruna-cover-date>
          <span className={styles.heroDateLabel}>Save the date</span>
          <span className={styles.heroDate}>
            {invitation.hero.primaryDateLabel ?? 'Hari bahagia kami'}
          </span>
        </div>
      </header>

      <a data-aruna-opening-action data-invitation-opening-action href={`#${openingTargetId}`}>
        <span>Buka undangan</span>
        <span aria-hidden="true">↓</span>
      </a>

      {personalSlots?.greeting ? (
        <div
          aria-label="Sapaan untuk tamu"
          className={styles.personalGreeting}
          data-aruna-editors-note
          data-template-personal-greeting="aruna"
          id="aruna-personal-greeting"
          role="region"
        >
          {personalSlots.greeting}
        </div>
      ) : null}

      <div className={styles.content} data-aruna-journal-pages>
        <section
          aria-labelledby="aruna-couple-title"
          className={styles.coupleSection}
          data-aruna-couple-feature
          data-invitation-chapter="couple"
        >
          <div className={styles.sectionHeading}>
            <p>Perayaan cinta</p>
            <h2 id="aruna-couple-title">Dengan sukacita kami mengundang Anda</h2>
          </div>
          <div className={styles.coupleGrid} data-aruna-profile-grid>
            <Person person={invitation.couple.personOne} sequence={1} />
            <span className={styles.ampersand} aria-hidden="true">
              &amp;
            </span>
            <Person person={invitation.couple.personTwo} sequence={2} />
          </div>
        </section>

        {invitation.story ? (
          <section
            aria-labelledby="aruna-story-title"
            className={styles.storySection}
            data-aruna-feature-story
            data-invitation-chapter="story"
          >
            <p className={styles.sectionKicker}>Cerita kami</p>
            <h2 id="aruna-story-title">{invitation.story.heading ?? 'Cerita kami'}</h2>
            {invitation.story.body ? <p className={styles.prose}>{invitation.story.body}</p> : null}
          </section>
        ) : null}

        {hasScheduleJourney ? (
          <div
            aria-label="Jadwal dan lokasi perayaan"
            data-aruna-agenda
            data-invitation-schedule-journey="aruna"
            role="group"
          >
            {invitation.events ? (
              <section
                aria-labelledby="aruna-events-title"
                className={styles.eventsSection}
                data-aruna-agenda-page
                data-invitation-chapter="schedule"
              >
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
              <section
                aria-labelledby="aruna-location-title"
                className={styles.locationSection}
                data-aruna-venue-brief
                data-invitation-chapter="location"
              >
                <p className={styles.sectionKicker}>Lokasi utama</p>
                <h2 id="aruna-location-title">Mari bertemu di sini</h2>
                {invitation.location.venueName ? (
                  <p className={styles.locationVenue}>{invitation.location.venueName}</p>
                ) : null}
                {invitation.location.address ? (
                  <p className={styles.prose}>{invitation.location.address}</p>
                ) : null}
                {invitation.location.mapsHref ? (
                  <a
                    aria-label="Buka peta lokasi di tab baru"
                    className={styles.mapsLink}
                    href={invitation.location.mapsHref}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Buka peta
                  </a>
                ) : null}
              </section>
            ) : null}
          </div>
        ) : null}

        {invitation.gallery ? (
          <section
            aria-labelledby="aruna-gallery-title"
            className={styles.gallerySection}
            data-aruna-photo-essay
            data-gallery-count={invitation.gallery.images.length}
            data-invitation-chapter="gallery"
            data-invitation-gallery
          >
            <div className={styles.sectionHeading}>
              <p>Galeri</p>
              <h2 id="aruna-gallery-title">Fragmen yang kami simpan</h2>
            </div>
            <div className={styles.galleryGrid} data-aruna-photo-grid>
              {invitation.gallery.images.map((image, index) => (
                <figure
                  className={styles.galleryFigure}
                  data-aruna-photo-frame
                  data-photo-sequence={String(index + 1).padStart(2, '0')}
                  key={image.id}
                >
                  <InvitationGalleryImage
                    alt={image.alt}
                    className={styles.galleryImage}
                    src={image.src}
                  />
                  <figcaption aria-hidden="true">{String(index + 1).padStart(2, '0')}</figcaption>
                </figure>
              ))}
            </div>
          </section>
        ) : null}

        {invitation.digitalGift ? (
          <section
            aria-labelledby="aruna-digital-gift-title"
            className={styles.digitalGiftSection}
            data-aruna-gift-desk
            data-invitation-chapter="gift"
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

        {hasPersonalResponse ? (
          <div
            className={styles.personalResponseJourney}
            data-aruna-reader-response
            data-template-response-journey="aruna"
          >
            <div data-template-response-introduction="aruna">
              <p data-personal-response-eyebrow>Respons tamu</p>
              <h2 data-personal-response-title>Kabar dari Anda</h2>
              <p data-personal-response-copy>{personalResponseLead}</p>
            </div>
            {personalSlots?.rsvp ? (
              <div
                className={styles.personalResponseSection}
                data-aruna-response-column="rsvp"
                data-template-response-slot="rsvp"
              >
                {personalSlots.rsvp}
              </div>
            ) : null}
            {personalSlots?.guestbook ? (
              <div
                className={styles.personalResponseSection}
                data-aruna-response-column="guestbook"
                data-template-response-slot="guestbook"
              >
                {personalSlots.guestbook}
              </div>
            ) : null}
          </div>
        ) : null}

        {showGenericResponseNote ? (
          <p className={styles.genericResponseNote} data-generic-response-note="aruna">
            {genericResponseCopy}
          </p>
        ) : null}

        {invitation.closing ? (
          <section
            aria-labelledby="aruna-closing-title"
            className={styles.closingSection}
            data-aruna-colophon
            data-invitation-chapter="closing"
          >
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

      <a data-aruna-return-action data-invitation-return-action href="#aruna-invitation-title">
        <span aria-hidden="true">↑</span>
        Kembali ke awal
      </a>
    </article>
  );
}
