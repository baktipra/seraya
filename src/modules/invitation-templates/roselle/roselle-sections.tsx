import { DigitalGiftCopyButton } from '../digital-gift-copy-button';
import { InvitationGalleryImage } from '../invitation-gallery-image';
import type { InvitationViewModel } from '../invitation-view-model';

import { RoselleDivider, RosellePetalDecoration } from './roselle-decoration';
import styles from './roselle.module.css';

type RoselleNarrativeImage = NonNullable<InvitationViewModel['gallery']>['images'][number];
type RoselleHeroProps = Pick<InvitationViewModel, 'hero'> & {
  openingImage?: RoselleNarrativeImage | null;
  openingMediaSource?: 'featured-cover' | 'gallery-first' | null;
};
type RoselleStoryProps = Pick<InvitationViewModel, 'story'> & {
  storyImage?: RoselleNarrativeImage | null;
};
type RoselleWeddingFilmProps = {
  weddingFilm: NonNullable<InvitationViewModel['premiumMedia']>['weddingFilm'];
};

export function RoselleHero({
  hero,
  openingImage = null,
  openingMediaSource = null,
}: RoselleHeroProps) {
  return (
    <header
      className={styles.hero}
      data-has-opening-portrait={openingImage ? 'true' : 'false'}
      data-roselle-chapter="opening"
    >
      {openingImage ? (
        <div
          aria-hidden="true"
          data-roselle-opening-media-source={openingMediaSource ?? 'gallery-first'}
          data-roselle-opening-portrait
        >
          <InvitationGalleryImage
            alt=""
            fetchPriority="high"
            loading="eager"
            sizes="(max-width: 54rem) 100vw, 54rem"
            src={openingImage.src}
          />
        </div>
      ) : null}
      <RosellePetalDecoration className={styles.heroPetalOne} />
      <RosellePetalDecoration className={styles.heroPetalTwo} />
      <div className={styles.heroLetter} data-roselle-letter>
        <p className={styles.eyebrow} data-roselle-letter-eyebrow>
          {hero.eyebrow ?? 'Undangan Pernikahan'}
        </p>
        <h1 className={styles.heroTitle} data-roselle-letter-title id="roselle-invitation-title">
          {hero.title}
        </h1>
        {hero.subtitle ? (
          <p className={styles.heroSubtitle} data-roselle-letter-subtitle>
            {hero.subtitle}
          </p>
        ) : null}
        {hero.primaryDateLabel ? (
          <p className={styles.heroDate} data-roselle-letter-date>
            {hero.primaryDateLabel}
          </p>
        ) : null}
        <RoselleDivider />
      </div>
      <p aria-hidden="true" className={styles.scrollCue} data-roselle-scroll-cue>
        <span>Gulir untuk melanjutkan</span>
        <i />
      </p>
    </header>
  );
}

function RosellePerson({ person }: { person: InvitationViewModel['couple']['personOne'] }) {
  const socialLinks = person.socialLinks ?? [];

  return (
    <article
      className={styles.person}
      data-has-portrait={person.portrait ? 'true' : 'false'}
      data-roselle-person
    >
      {person.portrait ? (
        <figure data-roselle-person-media>
          <InvitationGalleryImage
            alt={`Potret ${person.displayName}`}
            sizes="(max-width: 40rem) min(78vw, 22rem), 20rem"
            src={person.portrait.src}
          />
        </figure>
      ) : null}
      <div data-roselle-person-copy>
        <h3 className={styles.personName}>{person.displayName}</h3>
        {person.fullName ? <p className={styles.personFullName}>{person.fullName}</p> : null}
        {person.parentLine ? <p className={styles.personParentLine}>{person.parentLine}</p> : null}
        {socialLinks.length > 0 ? (
          <nav aria-label={`Tautan ${person.displayName}`} data-roselle-person-socials>
            {socialLinks.map((link) => (
              <a
                data-social-provider={link.provider}
                href={link.href}
                key={link.provider}
                rel="noopener noreferrer"
                target="_blank"
              >
                {link.label}
              </a>
            ))}
          </nav>
        ) : null}
      </div>
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
      <div className={styles.coupleGrid} data-roselle-couple-composition>
        <RosellePerson person={couple.personOne} />
        <span aria-hidden="true" className={styles.coupleAmpersand} data-roselle-ampersand>
          &amp;
        </span>
        <RosellePerson person={couple.personTwo} />
      </div>
    </section>
  );
}

export function RoselleStory({ story, storyImage = null }: RoselleStoryProps) {
  if (!story) {
    return null;
  }

  return (
    <section
      aria-labelledby="roselle-story-title"
      className={styles.storySection}
      data-has-story-media={storyImage ? 'true' : 'false'}
      data-roselle-chapter="story"
    >
      <RosellePetalDecoration className={styles.storyPetal} />
      {storyImage ? (
        <figure aria-hidden="true" data-roselle-story-media>
          <InvitationGalleryImage
            alt=""
            sizes="(max-width: 36rem) calc(100vw - 3rem), 24rem"
            src={storyImage.src}
          />
        </figure>
      ) : null}
      <div className={styles.storyInner} data-roselle-story-letter>
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
    <article className={styles.eventPart} data-roselle-event data-schedule-event="roselle">
      <p className={styles.eventSequence}>{String(sequence).padStart(2, '0')}</p>
      {event.title ? <h3 className={styles.eventTitle}>{event.title}</h3> : null}
      {showDate && event.dateLabel ? <p className={styles.eventDate}>{event.dateLabel}</p> : null}
      {event.timeLabel ? <p className={styles.eventTime}>{event.timeLabel}</p> : null}
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
      data-roselle-woven-schedule
    >
      <p className={styles.sectionEyebrow}>Rangkaian acara</p>
      <h2 className={styles.sectionTitle} id="roselle-events-title">
        Hari yang kami nantikan
      </h2>
      {events.primaryDateLabel ? (
        <p className={styles.eventPrimaryDate}>{events.primaryDateLabel}</p>
      ) : null}
      {events.items.length > 0 ? (
        <div
          className={styles.eventGrid}
          data-event-layout={getEventLayout(events.items.length)}
          data-roselle-event-thread
        >
          {events.items.map((event, index) => (
            <RoselleScheduleEvent
              event={event}
              key={event.id ?? `${event.title ?? 'acara'}-${index}`}
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
      <div className={styles.locationContent} data-roselle-location-note>
        {location.venueName ? <p className={styles.locationVenue}>{location.venueName}</p> : null}
        {location.address ? <p className={styles.locationAddress}>{location.address}</p> : null}
        {location.mapsHref ? (
          <a
            aria-label="Buka peta lokasi di tab baru"
            className={styles.mapsLink}
            href={location.mapsHref}
            rel="noopener noreferrer"
            target="_blank"
          >
            Buka peta
          </a>
        ) : null}
      </div>
    </section>
  );
}

export function RoselleWeddingFilm({ weddingFilm }: RoselleWeddingFilmProps) {
  if (!weddingFilm) {
    return null;
  }

  return (
    <section
      aria-labelledby="roselle-wedding-film-title"
      data-roselle-chapter="film"
      data-roselle-wedding-film
    >
      <div data-roselle-film-copy>
        <p className={styles.sectionEyebrow}>Wedding Film</p>
        <h2 className={styles.sectionTitle} id="roselle-wedding-film-title">
          {weddingFilm.heading}
        </h2>
        {weddingFilm.caption ? <p>{weddingFilm.caption}</p> : null}
      </div>
      <div data-roselle-film-frame>
        <iframe
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          src={weddingFilm.embedHref}
          title={weddingFilm.heading}
        />
      </div>
      <a href={weddingFilm.watchHref} rel="noopener noreferrer" target="_blank">
        Buka di YouTube
      </a>
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
      data-invitation-gallery
      data-roselle-chapter="gallery"
    >
      <p className={styles.sectionEyebrow}>Galeri</p>
      <h2 className={styles.sectionTitle} id="roselle-gallery-title">
        Fragmen yang kami simpan
      </h2>
      <div
        className={styles.galleryGrid}
        data-gallery-layout={galleryLayout}
        data-roselle-memory-album
      >
        {gallery.images.map((image, index) => (
          <figure className={styles.galleryFigure} data-gallery-index={index} key={image.id}>
            <InvitationGalleryImage
              alt={image.alt}
              className={styles.galleryImage}
              src={image.src}
            />
            <figcaption aria-hidden="true" data-roselle-memory-caption>
              {String(index + 1).padStart(2, '0')}
            </figcaption>
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
      data-roselle-gift-enclosure
    >
      <p className={styles.sectionEyebrow}>Hadiah &amp; doa</p>
      <h2 className={styles.sectionTitle} id="roselle-digital-gift-title">
        {digitalGift.heading}
      </h2>
      {digitalGift.lead ? <p className={styles.prose}>{digitalGift.lead}</p> : null}
      <div className={styles.digitalGiftGrid} data-roselle-keepsake-list>
        {digitalGift.accounts.map((account) => (
          <article className={styles.digitalGiftCard} data-roselle-keepsake key={account.id}>
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
      data-roselle-letter-closing
    >
      <RosellePetalDecoration className={styles.closingPetal} />
      <span aria-hidden="true" data-roselle-closing-seal>
        ✦
      </span>
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
