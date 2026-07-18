import {
  getPersonalInvitationPresentationSlots,
  type InvitationTemplateProps,
} from '../invitation-template.types';

import {
  RoselleClosing,
  RoselleCouple,
  RoselleDigitalGift,
  RoselleEvents,
  RoselleGallery,
  RoselleHero,
  RoselleLocation,
  RoselleStory,
} from './roselle-sections';
import styles from './roselle.module.css';

/** Roselle presentation renderer. It accepts only an already mapped typed view model. */
export function RoselleTemplate({ invitation, renderContext }: InvitationTemplateProps) {
  const personalSlots = getPersonalInvitationPresentationSlots(renderContext);
  const hasPersonalResponse = Boolean(personalSlots?.rsvp || personalSlots?.guestbook);
  const showGenericResponseNote = renderContext.surface !== 'personal' && Boolean(invitation.rsvp);

  return (
    <article
      aria-labelledby="roselle-invitation-title"
      className={styles.invitation}
      data-surface={renderContext.surface}
      data-template="roselle"
    >
      <RoselleHero hero={invitation.hero} />
      {personalSlots?.greeting ? (
        <div className={styles.personalGreeting} data-template-personal-greeting="roselle">
          {personalSlots.greeting}
        </div>
      ) : null}
      <div className={styles.content}>
        <RoselleCouple couple={invitation.couple} />
        <RoselleStory story={invitation.story} />
        <RoselleEvents events={invitation.events} />
        <RoselleLocation location={invitation.location} />
        <RoselleGallery gallery={invitation.gallery} />
        <RoselleDigitalGift digitalGift={invitation.digitalGift} />
        {hasPersonalResponse ? (
          <div className={styles.personalResponseJourney} data-template-response-journey="roselle">
            <div className={styles.responseIntroduction}>
              <p className={styles.sectionEyebrow}>Untuk tamu terkasih</p>
              <h2 className={styles.responseTitle}>Kabar dari Anda</h2>
              <p className={styles.responseLead}>
                Kehadiran dan doa Anda akan melengkapi hari bahagia kami.
              </p>
            </div>
            {personalSlots?.rsvp ? (
              <div className={styles.personalResponseSection} data-template-response-slot="rsvp">
                {personalSlots.rsvp}
              </div>
            ) : null}
            {personalSlots?.guestbook ? (
              <div
                className={styles.personalResponseSection}
                data-template-response-slot="guestbook"
              >
                {personalSlots.guestbook}
              </div>
            ) : null}
          </div>
        ) : null}
        {showGenericResponseNote ? (
          <p className={styles.genericResponseNote} data-generic-response-note="roselle">
            Konfirmasi kehadiran dan ucapan dapat dikirim melalui undangan pribadi dari pasangan.
          </p>
        ) : null}
        <RoselleClosing closing={invitation.closing} />
      </div>
    </article>
  );
}
