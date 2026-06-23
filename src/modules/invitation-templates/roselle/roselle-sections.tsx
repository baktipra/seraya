/* eslint-disable @next/next/no-img-element -- Roselle receives only local Seraya media proxy URLs; image optimization/CDN work is out of scope. */
import type { InvitationViewModel } from '../invitation-view-model';

import { RoselleDivider, RosellePetalDecoration } from './roselle-decoration';
import styles from './roselle.module.css';

type RoselleHeroProps = Pick<InvitationViewModel, 'hero'>;

export function RoselleHero({ hero }: RoselleHeroProps) {
  return (
    <header className={styles.hero}>
      <RosellePetalDecoration className={styles.heroPetalOne} />
      <RosellePetalDecoration className={styles.heroPetalTwo} />
      {hero.eyebrow ? <p className={styles.eyebrow}>{hero.eyebrow}</p> : null}
      <h1 className={styles.heroTitle} id="roselle-invitation-title">
        {hero.title}
      </h1>
      {hero.subtitle ? <p className={styles.heroSubtitle}>{hero.subtitle}</p> : null}
      {hero.primaryDateLabel ? <p className={styles.heroDate}>{hero.primaryDateLabel}</p> : null}
      <RoselleDivider />
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
    <section aria-labelledby="roselle-couple-title" className={styles.section}>
      <p className={styles.sectionEyebrow}>Mempelai</p>
      <h2 className={styles.sectionTitle} id="roselle-couple-title">
        Dengan penuh cinta
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
    <section aria-labelledby="roselle-story-title" className={styles.section}>
      <p className={styles.sectionEyebrow}>Cerita kami</p>
      <h2 className={styles.sectionTitle} id="roselle-story-title">
        {story.heading ?? 'Cerita kami'}
      </h2>
      {story.body ? <p className={styles.prose}>{story.body}</p> : null}
    </section>
  );
}

function RoselleEventPart({
  event,
}: {
  event: NonNullable<InvitationViewModel['events']>['ceremony'];
}) {
  if (!event) {
    return null;
  }

  return (
    <article className={styles.eventPart}>
      {event.title ? <h3 className={styles.eventTitle}>{event.title}</h3> : null}
      {event.dateLabel ? <p>{event.dateLabel}</p> : null}
      {event.timeLabel ? <p>{event.timeLabel}</p> : null}
    </article>
  );
}

export function RoselleEvents({ events }: Pick<InvitationViewModel, 'events'>) {
  if (!events) {
    return null;
  }

  return (
    <section aria-labelledby="roselle-events-title" className={styles.section}>
      <p className={styles.sectionEyebrow}>Rangkaian acara</p>
      <h2 className={styles.sectionTitle} id="roselle-events-title">
        Hari bahagia kami
      </h2>
      {events.primaryDateLabel ? (
        <p className={styles.eventPrimaryDate}>{events.primaryDateLabel}</p>
      ) : null}
      {events.ceremony || events.reception ? (
        <div className={styles.eventGrid}>
          <RoselleEventPart event={events.ceremony} />
          <RoselleEventPart event={events.reception} />
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
    <section aria-labelledby="roselle-location-title" className={styles.section}>
      <p className={styles.sectionEyebrow}>Lokasi</p>
      <h2 className={styles.sectionTitle} id="roselle-location-title">
        Tempat kami bersua
      </h2>
      <div className={styles.locationContent}>
        {location.venueName ? <p className={styles.locationVenue}>{location.venueName}</p> : null}
        {location.address ? <p className={styles.locationAddress}>{location.address}</p> : null}
        {location.mapsHref ? (
          <a className={styles.mapsLink} href={location.mapsHref} rel="noreferrer" target="_blank">
            Buka peta lokasi (tab baru)
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

  return (
    <section aria-labelledby="roselle-gallery-title" className={styles.section}>
      <p className={styles.sectionEyebrow}>Galeri</p>
      <h2 className={styles.sectionTitle} id="roselle-gallery-title">
        Potret kami
      </h2>
      <div className={styles.galleryGrid}>
        {gallery.images.map((image) => (
          <figure className={styles.galleryFigure} key={image.id}>
            <img alt={image.alt} className={styles.galleryImage} loading="lazy" src={image.src} />
          </figure>
        ))}
      </div>
    </section>
  );
}

export function RoselleRsvp({ rsvp }: Pick<InvitationViewModel, 'rsvp'>) {
  if (!rsvp) {
    return null;
  }

  return (
    <section aria-labelledby="roselle-rsvp-title" className={styles.rsvpSection}>
      <p className={styles.sectionEyebrow}>RSVP</p>
      <h2 className={styles.sectionTitle} id="roselle-rsvp-title">
        {rsvp.heading}
      </h2>
      <p className={styles.prose}>{rsvp.lead}</p>
    </section>
  );
}

export function RoselleClosing({ closing }: Pick<InvitationViewModel, 'closing'>) {
  if (!closing) {
    return null;
  }

  return (
    <section aria-labelledby="roselle-closing-title" className={styles.closing}>
      <RosellePetalDecoration className={styles.closingPetal} />
      <h2 className={styles.closingTitle} id="roselle-closing-title">
        Dengan penuh kasih
      </h2>
      {closing.message ? <p className={styles.prose}>{closing.message}</p> : null}
      {closing.signature ? <p className={styles.signature}>{closing.signature}</p> : null}
    </section>
  );
}
