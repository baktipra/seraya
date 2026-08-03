import { DigitalGiftCopyButton } from '../digital-gift-copy-button';
import { InvitationGalleryImage } from '../invitation-gallery-image';
import {
  getPersonalInvitationPresentationSlots,
  type InvitationTemplateProps,
} from '../invitation-template.types';

import experienceStyles from './laras-guest-experience.module.css';
import { createLarasMonogram } from './laras-monogram';
import styles from './laras.module.css';

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
      data-laras-couple-profile
      data-profile-sequence={String(sequence).padStart(2, '0')}
    >
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
  const sequenceLabel = String(sequence).padStart(2, '0');

  return (
    <article
      className={styles.eventCard}
      data-laras-program-entry
      data-program-sequence={sequenceLabel}
      data-schedule-event="laras"
    >
      <span className={styles.eventLabel}>{sequenceLabel}</span>
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

/** Formal evening ceremony-folio invitation composition. */
export function LarasTemplate({ invitation, renderContext }: InvitationTemplateProps) {
  const personalSlots = getPersonalInvitationPresentationSlots(renderContext);
  const hasPersonalResponse = Boolean(personalSlots?.rsvp || personalSlots?.guestbook);
  const showGenericResponseNote = renderContext.surface !== 'personal';
  const genericResponseCopy = invitation.rsvp
    ? 'Konfirmasi kehadiran dan ucapan dapat dikirim melalui undangan pribadi dari pasangan.'
    : 'Ucapan dapat dikirim melalui undangan pribadi dari pasangan.';
  const personalResponseLead = personalSlots?.rsvp
    ? personalSlots.guestbook
      ? 'Mohon konfirmasikan kehadiran dan sampaikan ucapan terbaik Anda.'
      : 'Mohon konfirmasikan kehadiran Anda untuk membantu persiapan acara.'
    : 'Sampaikan doa dan ucapan terbaik Anda untuk kedua mempelai.';
  const monogram = createLarasMonogram(
    invitation.couple.personOne.displayName,
    invitation.couple.personTwo.displayName,
  );
  const openingTargetId = personalSlots?.greeting
    ? 'laras-personal-greeting'
    : 'laras-couple-title';
  const hasScheduleJourney = Boolean(invitation.events || invitation.location);

  return (
    <article
      aria-labelledby="laras-invitation-title"
      className={`${styles.invitation} ${experienceStyles.experience}`}
      data-laras-experience="evening-folio-v1"
      data-surface={renderContext.surface}
      data-template="laras"
    >
      <header
        className={styles.hero}
        data-invitation-chapter="opening"
        data-laras-evening-cover
      >
        <span className={styles.cornerTop} data-laras-cover-corner="top" aria-hidden="true" />
        <span
          className={styles.cornerBottom}
          data-laras-cover-corner="bottom"
          aria-hidden="true"
        />
        <p className={styles.eyebrow} data-laras-cover-eyebrow>
          {invitation.hero.eyebrow ?? 'The Wedding Of'}
        </p>
        <div
          className={styles.monogram}
          aria-hidden="true"
          data-laras-crest
          data-opening-monogram
        >
          {monogram}
        </div>
        <h1 id="laras-invitation-title" data-laras-cover-title>
          {invitation.hero.title}
        </h1>
        {invitation.hero.subtitle ? (
          <p className={styles.heroSubtitle} data-laras-cover-subtitle>
            {invitation.hero.subtitle}
          </p>
        ) : null}
        {invitation.hero.primaryDateLabel ? (
          <p className={styles.heroDate} data-laras-cover-date>
            {invitation.hero.primaryDateLabel}
          </p>
        ) : null}
      </header>

      <a
        data-invitation-opening-action
        data-laras-opening-action
        href={`#${openingTargetId}`}
      >
        <span>Buka undangan</span>
        <span aria-hidden="true">↓</span>
      </a>

      {personalSlots?.greeting ? (
        <div
          aria-label="Sapaan untuk tamu"
          className={styles.personalGreeting}
          data-laras-place-card
          data-template-personal-greeting="laras"
          id="laras-personal-greeting"
          role="region"
        >
          {personalSlots.greeting}
        </div>
      ) : null}

      <div className={styles.content} data-laras-evening-pages>
        <section
          aria-labelledby="laras-couple-title"
          className={styles.coupleSection}
          data-invitation-chapter="couple"
          data-laras-couple-presentation
        >
          <p className={styles.sectionLabel}>Kami yang berbahagia</p>
          <h2 id="laras-couple-title">Merayakan awal yang baru</h2>
          <div className={styles.coupleGrid} data-laras-couple-grid>
            <Person person={invitation.couple.personOne} sequence={1} />
            <span className={styles.ampersand} data-laras-couple-medallion aria-hidden="true">
              &amp;
            </span>
            <Person person={invitation.couple.personTwo} sequence={2} />
          </div>
        </section>

        {invitation.story ? (
          <section
            aria-labelledby="laras-story-title"
            className={styles.storySection}
            data-invitation-chapter="story"
            data-laras-toast-note
          >
            <p className={styles.sectionLabel}>Catatan kecil</p>
            <h2 id="laras-story-title">{invitation.story.heading ?? 'Cerita kami'}</h2>
            {invitation.story.body ? <p className={styles.prose}>{invitation.story.body}</p> : null}
          </section>
        ) : null}

        {hasScheduleJourney ? (
          <div
            aria-label="Jadwal dan lokasi perayaan"
            data-invitation-schedule-journey="laras"
            data-laras-evening-program
            role="group"
          >
            {invitation.events ? (
              <section
                aria-labelledby="laras-events-title"
                className={styles.eventsSection}
                data-invitation-chapter="schedule"
                data-laras-program-page
              >
                <div className={styles.eventsHeading} data-laras-program-heading>
                  <p className={styles.sectionLabel}>Rangkaian acara</p>
                  <h2 id="laras-events-title">Malam yang kami nantikan</h2>
                  {invitation.events.primaryDateLabel ? (
                    <p className={styles.primaryDate}>{invitation.events.primaryDateLabel}</p>
                  ) : null}
                </div>
                {invitation.events.items.length > 0 ? (
                  <div className={styles.eventsGrid} data-laras-program-list>
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
                aria-labelledby="laras-location-title"
                className={styles.locationSection}
                data-invitation-chapter="location"
                data-laras-venue-card
              >
                <p className={styles.sectionLabel}>Lokasi utama</p>
                <h2 id="laras-location-title">Tempat perayaan kami</h2>
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
            aria-labelledby="laras-gallery-title"
            className={styles.gallerySection}
            data-gallery-count={invitation.gallery.images.length}
            data-invitation-chapter="gallery"
            data-invitation-gallery
            data-laras-salon-gallery
          >
            <p className={styles.sectionLabel}>Galeri</p>
            <h2 id="laras-gallery-title">Momen yang kami pilih</h2>
            <div className={styles.galleryGrid} data-laras-salon-grid>
              {invitation.gallery.images.map((image, index) => (
                <figure
                  className={styles.galleryFigure}
                  data-laras-salon-frame
                  data-photo-sequence={String(index + 1).padStart(2, '0')}
                  key={image.id}
                >
                  <InvitationGalleryImage
                    alt={image.alt}
                    className={styles.galleryImage}
                    src={image.src}
                  />
                  <figcaption aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        ) : null}

        {invitation.digitalGift ? (
          <section
            aria-labelledby="laras-digital-gift-title"
            className={styles.digitalGiftSection}
            data-invitation-chapter="gift"
            data-laras-gift-ledger
          >
            <div className={styles.digitalGiftHeading}>
              <p className={styles.sectionLabel}>Amplop Digital</p>
              <h2 id="laras-digital-gift-title">{invitation.digitalGift.heading}</h2>
              {invitation.digitalGift.lead ? (
                <p className={styles.prose}>{invitation.digitalGift.lead}</p>
              ) : null}
            </div>
            <div className={styles.digitalGiftGrid}>
              {invitation.digitalGift.accounts.map((account, index) => (
                <article
                  className={styles.digitalGiftCard}
                  data-gift-sequence={String(index + 1).padStart(2, '0')}
                  data-laras-gift-entry
                  key={account.id}
                >
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

        {hasPersonalResponse ? (
          <div
            className={styles.personalResponseJourney}
            data-laras-response-ledger
            data-template-response-journey="laras"
          >
            <div data-template-response-introduction="laras">
              <p data-personal-response-eyebrow>Respons tamu</p>
              <h2 data-personal-response-title>Kabar dari Anda</h2>
              <p data-personal-response-copy>{personalResponseLead}</p>
            </div>
            {personalSlots?.rsvp ? (
              <div
                className={styles.personalResponseSection}
                data-laras-response-panel
                data-response-kind="rsvp"
                data-template-response-slot="rsvp"
              >
                {personalSlots.rsvp}
              </div>
            ) : null}
            {personalSlots?.guestbook ? (
              <div
                className={styles.personalResponseSection}
                data-laras-response-panel
                data-response-kind="guestbook"
                data-template-response-slot="guestbook"
              >
                {personalSlots.guestbook}
              </div>
            ) : null}
          </div>
        ) : null}

        {showGenericResponseNote ? (
          <p
            className={styles.genericResponseNote}
            data-generic-response-note="laras"
            data-laras-private-response-note
          >
            {genericResponseCopy}
          </p>
        ) : null}

        {invitation.closing ? (
          <section
            aria-labelledby="laras-closing-title"
            className={styles.closingSection}
            data-invitation-chapter="closing"
            data-laras-final-toast
          >
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

      <a
        data-invitation-return-action
        data-laras-return-action
        href="#laras-invitation-title"
      >
        <span aria-hidden="true">↑</span>
        Kembali ke awal
      </a>
    </article>
  );
}
