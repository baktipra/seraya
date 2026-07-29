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
  const showGenericResponseNote = renderContext.surface !== 'personal';
  const genericResponseCopy = invitation.rsvp
    ? 'Konfirmasi kehadiran dan ucapan dapat dikirim melalui undangan pribadi dari pasangan.'
    : 'Ucapan dapat dikirim melalui undangan pribadi dari pasangan.';
  const personalResponseLead = personalSlots?.rsvp
    ? personalSlots.guestbook
      ? 'Kehadiran dan doa Anda akan melengkapi hari bahagia kami.'
      : 'Konfirmasikan kehadiran Anda untuk membantu pasangan mempersiapkan hari bahagia.'
    : 'Titipkan doa dan ucapan terbaik Anda untuk pasangan.';
  const responseStepCount =
    Number(Boolean(personalSlots?.rsvp)) + Number(Boolean(personalSlots?.guestbook));
  const rsvpStepNumber = personalSlots?.rsvp ? 1 : null;
  const guestbookStepNumber = personalSlots?.guestbook ? (personalSlots.rsvp ? 2 : 1) : null;
  const openingTargetId = personalSlots?.greeting
    ? 'roselle-personal-greeting'
    : 'roselle-couple-title';

  return (
    <article
      aria-labelledby="roselle-invitation-title"
      className={styles.invitation}
      data-surface={renderContext.surface}
      data-template="roselle"
    >
      <RoselleHero hero={invitation.hero} />
      <a data-roselle-opening-action href={`#${openingTargetId}`}>
        <span>Buka undangan</span>
        <i aria-hidden="true" />
      </a>
      {personalSlots?.greeting ? (
        <div
          aria-label="Sapaan untuk tamu"
          className={styles.personalGreeting}
          data-roselle-addressed-letter
          data-template-personal-greeting="roselle"
          id="roselle-personal-greeting"
          role="region"
        >
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
            <div
              className={styles.responseIntroduction}
              data-template-response-introduction="roselle"
            >
              <p className={styles.sectionEyebrow}>Untuk tamu terkasih</p>
              <h2 className={styles.responseTitle}>Kabar dari Anda</h2>
              <p className={styles.responseLead}>{personalResponseLead}</p>
            </div>
            {personalSlots?.rsvp ? (
              <div className={styles.personalResponseSection} data-template-response-slot="rsvp">
                <p aria-hidden="true" data-roselle-response-step>
                  Langkah {rsvpStepNumber} dari {responseStepCount}
                </p>
                {personalSlots.rsvp}
              </div>
            ) : null}
            {personalSlots?.guestbook ? (
              <div
                className={styles.personalResponseSection}
                data-template-response-slot="guestbook"
              >
                <p aria-hidden="true" data-roselle-response-step>
                  Langkah {guestbookStepNumber} dari {responseStepCount}
                </p>
                {personalSlots.guestbook}
              </div>
            ) : null}
          </div>
        ) : null}
        {showGenericResponseNote ? (
          <p className={styles.genericResponseNote} data-generic-response-note="roselle">
            {genericResponseCopy}
          </p>
        ) : null}
        <RoselleClosing closing={invitation.closing} />
      </div>
      <a data-roselle-return-to-opening href="#roselle-invitation-title">
        <span aria-hidden="true">↑</span>
        Kembali ke awal
      </a>
    </article>
  );
}
