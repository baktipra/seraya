import type { InvitationTemplateProps } from '../invitation-template.types';

import {
  RoselleClosing,
  RoselleCouple,
  RoselleEvents,
  RoselleGallery,
  RoselleHero,
  RoselleLocation,
  RoselleRsvp,
  RoselleStory,
} from './roselle-sections';
import styles from './roselle.module.css';

/** Roselle presentation renderer. It accepts only an already mapped typed view model. */
export function RoselleTemplate({ invitation }: InvitationTemplateProps) {
  return (
    <article
      aria-labelledby="roselle-invitation-title"
      className={styles.invitation}
      data-template="roselle"
    >
      <RoselleHero hero={invitation.hero} />
      <div className={styles.content}>
        <RoselleCouple couple={invitation.couple} />
        <RoselleStory story={invitation.story} />
        <RoselleEvents events={invitation.events} />
        <RoselleLocation location={invitation.location} />
        <RoselleGallery gallery={invitation.gallery} />
        <RoselleRsvp rsvp={invitation.rsvp} />
        <RoselleClosing closing={invitation.closing} />
      </div>
    </article>
  );
}
