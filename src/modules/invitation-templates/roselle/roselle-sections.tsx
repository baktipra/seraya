/* eslint-disable @next/next/no-img-element -- Roselle receives only local Seraya media proxy URLs; image optimization/CDN work is out of scope. */
import { DigitalGiftCopyButton } from '../digital-gift-copy-button';
import type { InvitationViewModel } from '../invitation-view-model';

import { RoselleDivider, RosellePetalDecoration } from './roselle-decoration';
import styles from './roselle.module.css';

type RoselleHeroProps = Pick<InvitationViewModel, 'hero'>;

export function RoselleHero({ hero }: RoselleHeroProps) {
  return (
    <header className={styles.hero} data-roselle-chapter="opening">
      <RosellePetalDecoration className={styles.heroPetalOne} />
      <RosellePetalDecoration className={styles.heroPetalTwo} />
      <div className={styles.heroLetter}>
        {hero.eyebrow ? <p className={styles.eyebrow}>{hero.eyebrow}</p> : null}
        <h1 className={styles.heroTitle} id="roselle-invitation-title">
          {hero.title}
        </h1>
        {hero.subtitle ? <p className={styles.heroSubtitle}>{hero.subtitle}</p> : null}
        {hero.primaryDateLabel ? <p className={styles.heroDate}>{hero.primaryDateLabel}</p> : null}
        <RoselleDivider />
      </div>
      <p aria-hidden="true" className={styles.scrollCue}>
        <span>Gulir untuk melanjutkan</span>
        <i />
      </p>
    </header>
  );
}

function RosellePerson({ person }: { person: InvitationViewModel['couple']['personOne'] }) {
  return (
    <article className={styles.person}>
      <h3 className={styles.personName}>{person.displayName}</h3>
      {person.fullName ? <p className={styles.personFullName}>{person.fullName}</p> : null}
      {person.parentLine ? <p className={styles.personParentLine}>{person.parentLine}</p> : null}
    </article>
  );
}

export function RoselleCouple({ couple }: Pick<InvitationViewModel, 'couple'>) {
  return (
    <section
      aria-labelledby="roselle-couple-title"
      className={styles.coupleSection}
      data-roselle-chapter="couple"
    >
      <p className={styles.sectionEyebrow}>Mempelai</p>
      <h2 className={styles.sectionTitle} id="roselle-couple-title">
        Dua cerita, satu perjalanan
      </h2>
      <div className={styles.coupleGrid}>
        <RosellePerson person={couple.personOne} />
        <span aria-hidden="true" className={styles.coupleAmpersand}>
          &amp;
        </span>
        <RosellePerson person={couple.personTwo} />
      </div>
    </section>
  );
}

export function RoselleStory({ story }: Pick<InvitationViewModel, 'story'>) {
  if (!story) {
    return null;
  }

  return (
    <section
      aria-labelledby="roselle-story-title"
      className={styles.storySection}
      data-roselle-chapter="story"
    >
      <RosellePetalDecoration className={styles.storyPetal} />
      <div className={styles.storyInner}>
        <p className={styles.sectionEyebrow}>Cerita kami</p>
        <h2 className={styles.storyTitle} id="roselle-story-title">
          {story.heading ?? 'Cerita kami'}
        </h2>
        {story.body ? <p className={styles.storyProse}>{story.body}</p> : null}
      </div>
    </section>
  );
}

function RoselleScheduleEvent({
  event,
  sequence,
  showDate,
}: {
  event: NonNullable<InvitationViewModel['events']>['items'][number];
  sequence: number;
  showDate: boolean;
}) {
  return (
    <article className={styles.eventPart} data-schedule-event="roselle">
      <p className={styles.eventSequence}>{String(sequence).padStart(2, '0')}</p>
      {event.title ? <h3 className={styles.eventTitle}>{event.title}</h3> : null}
      {showDate && event.dateLabel ? <p className={styles.eventDate}>{event.dateLabel}</p> : null}
      {event.timeLabel ? <p className={styles.eventTime}>{event.timeLabel}</p> : null}
      {event.venueName ? <p className={styles.eventVenue}>{event.venueName}</p> : null}
      {event.address ? <p className={styles.eventAddress}>{event.address}</p> : null}
      {event.mapsHref ? (
        <a
          className={styles.mapsLink}
          href={event.mapsHref}
          rel="noopener noreferrer"
          target="_blank"
          aria-label={`Buka peta${event.title ? ` ${event.title}` : ' acara'} di tab baru`}
        >
          Buka peta
        </a>
      ) : null}
    </article>
  );
}

export function RoselleEvents({ events }: Pick<InvitationViewModel, 'events'>) {
  if (!events) {
    return null;
  }

  return (
    <section
      aria-labelledby="roselle-events-title"
      className={styles.eventsSection}
      data-event-count={events.items.length}
      data-roselle-chapter="events"
    >
      <p className={styles.sectionEyebrow}>Rangkaian acara</p>
      <h2 className={styles.sectionTitle} id="roselle-events-title">
        Hari yang kami nantikan
      </h2>
      {events.primaryDateLabel ? (
        <p className={styles.eventPrimaryDate}>{events.primaryDateLabel}</p>
      ) : null}
      {events.items.length > 0 ? (
        <div className={styles.eventGrid} data-event-layout={getEventLayout(events.items.length)}>
          {events.items.map((event, index) => (
            <RoselleScheduleEvent
              event={event}
              key={`${event.title ?? 'acara'}-${index}`}
              sequence={index + 1}
              showDate={event.dateLabel !== events.primaryDateLabel}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function RoselleLocation({ location }: Pick<InvitationViewModel, 'location'>) {
  if (!location) {
    return null;
  }

  return (
    <section
      aria-labelledby="roselle-location-title"
      className={styles.locationSection}
      data-roselle-chapter="location"
    >
      <p className={styles.sectionEyebrow}>Lokasi</p>
      <h2 className={styles.sectionTitle} id="roselle-location-title">
        Tempat kami bersua
      </h2>
      <div className={styles.locationContent}>
        {location.venueName ? <p className={styles.locationVenue}>{location.venueName}</p> : null}
        {location.address ? <p className={styles.locationAddress}>{location.address}</p> : null}
        {location.mapsHref ? (
          <a
            className={styles.mapsLink}
            href={location.mapsHref}
            rel="noopener noreferrer"
            target="_blank"
            aria-label="Buka peta lokasi di tab baru"
          >
            Buka peta
          </a>
        ) : null}
      </div>
    </section>
  );
}

export function RoselleGallery({ gallery }: Pick<InvitationViewModel, 'gallery'>) {
  if (!gallery) {
    return null;
  }

  const galleryLayout = getGalleryLayout(gallery.images.length);

  return (
    <section
      aria-labelledby="roselle-gallery-title"
      className={styles.gallerySection}
      data-gallery-count={gallery.images.length}
      data-roselle-chapter="gallery"
    >
      <p className={styles.sectionEyebrow}>Galeri</p>
      <h2 className={styles.sectionTitle} id="roselle-gallery-title">
        Fragmen yang kami simpan
      </h2>
      <div className={styles.galleryGrid} data-gallery-layout={galleryLayout}>
        {gallery.images.map((image, index) => (
          <figure className={styles.galleryFigure} data-gallery-index={index} key={image.id}>
            <img alt={image.alt} className={styles.galleryImage} loading="lazy" src={image.src} />
          </figure>
        ))}
      </div>
    </section>
  );
}

export function RoselleDigitalGift({ digitalGift }: Pick<InvitationViewModel, 'digitalGift'>) {
  if (!digitalGift) {
    return null;
  }

  return (
    <section
      aria-labelledby="roselle-digital-gift-title"
      className={styles.digitalGiftSection}
      data-roselle-chapter="gift"
    >
      <p className={styles.sectionEyebrow}>Hadiah &amp; doa</p>
      <h2 className={styles.sectionTitle} id="roselle-digital-gift-title">
        {digitalGift.heading}
      </h2>
      {digitalGift.lead ? <p className={styles.prose}>{digitalGift.lead}</p> : null}
      <div className={styles.digitalGiftGrid}>
        {digitalGift.accounts.map((account) => (
          <article className={styles.digitalGiftCard} key={account.id}>
            <span aria-hidden="true" className={styles.digitalGiftRule} />
            <p className={styles.digitalGiftProvider}>{account.providerName}</p>
            <p className={styles.digitalGiftHolder}>{account.accountHolder}</p>
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
  );
}

export function RoselleClosing({ closing }: Pick<InvitationViewModel, 'closing'>) {
  if (!closing) {
    return null;
  }

  return (
    <section
      aria-labelledby="roselle-closing-title"
      className={styles.closing}
      data-roselle-chapter="closing"
    >
      <RosellePetalDecoration className={styles.closingPetal} />
      <p className={styles.sectionEyebrow}>Sampai berjumpa</p>
      <h2 className={styles.closingTitle} id="roselle-closing-title">
        Terima kasih telah menjadi bagian dari hari kami
      </h2>
      {closing.message ? <p className={styles.prose}>{closing.message}</p> : null}
      {closing.signature ? <p className={styles.signature}>{closing.signature}</p> : null}
    </section>
  );
}

export function getEventLayout(count: number) {
  if (count <= 1) {
    return 'single';
  }

  if (count === 2) {
    return 'pair';
  }

  return 'timeline';
}

export function getGalleryLayout(count: number) {
  if (count <= 1) {
    return 'single';
  }

  if (count === 2) {
    return 'diptych';
  }

  if (count === 3) {
    return 'triptych';
  }

  return 'mosaic';
}
