import {
  InvitationIdentityFooter,
  InvitationOpeningIdentity,
} from '../invitation-atmosphere-identity';
import {
  getPersonalInvitationPresentationSlots,
  type InvitationTemplateProps,
} from '../core/theme-renderer.types';
import { TemplateEventJourneyUtility } from '../template-event-journey-utility';

import compositionStyles from './roselle-flagship-composition.module.css';
import craftStyles from './roselle-flagship-craft.module.css';
import marketFloorStyles from './roselle-market-floor-v1.module.css';
import marketPolishStyles from './roselle-market-polish-v1.module.css';
import marketCorrectionStyles from './roselle-market-corrections-v1.module.css';
import immersiveStyles from './roselle-immersive-experience-v1.module.css';
import motionStyles from './roselle-flagship-motion.module.css';
import { RoselleMotionOrchestrator } from './roselle-motion-orchestrator';
import presentationMotionStyles from './roselle-presentation-motion-v3.module.css';
import premiumMediaStyles from './roselle-premium-media-v1.module.css';
import typographyStyles from './roselle-flagship-typography.module.css';
import experienceStyles from './roselle-guest-experience.module.css';
import parityRepairStyles from './roselle-parity-repair.module.css';
import {
  RoselleClosing,
  RoselleCouple,
  RoselleDigitalGift,
  RoselleEvents,
  RoselleGallery,
  RoselleHero,
  RoselleLocation,
  RoselleStory,
  RoselleWeddingFilm,
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
  const hasScheduleJourney = Boolean(invitation.events || invitation.location);
  const featuredCover = invitation.premiumMedia?.coverImage ?? null;
  const openingImage = featuredCover ?? invitation.gallery?.images[0] ?? null;
  const openingMediaSource = featuredCover ? 'featured-cover' : openingImage ? 'gallery-first' : null;
  const storyImage = invitation.premiumMedia?.storyImage ?? invitation.gallery?.images[1] ?? null;
  const weddingFilm = invitation.premiumMedia?.weddingFilm ?? null;

  return (
    <article
      aria-labelledby="roselle-invitation-title"
      className={`${styles.invitation} ${experienceStyles.experience} ${parityRepairStyles.parityRepair} ${compositionStyles.flagship} ${typographyStyles.typography} ${craftStyles.craft} ${motionStyles.motion} ${presentationMotionStyles.presentation} ${marketFloorStyles.marketFloor} ${marketPolishStyles.marketPolish} ${marketCorrectionStyles.marketCorrections} ${premiumMediaStyles.premiumMedia} ${immersiveStyles.immersive}`}
      data-palette={renderContext.palette?.key}
      data-roselle-composition="flagship-v1"
      data-roselle-craft="flagship-v1"
      data-roselle-experience="letter-v1"
      data-roselle-immersive="v1"
      data-roselle-market-corrections="v1"
      data-roselle-market-floor="v1"
      data-roselle-market-polish="v1"
      data-roselle-motion="flagship-v1"
      data-roselle-motion-language="cinematic-v2"
      data-roselle-premium-media="v1"
      data-roselle-scene-language="presentation-v3"
      data-roselle-typography="flagship-v1"
      data-surface={renderContext.surface}
      data-template="roselle"
      style={renderContext.palette?.variables}
    >
      <RoselleMotionOrchestrator />
      <div className={marketFloorStyles.openingGate} data-roselle-opening-gate="market-floor-v1">
        <RoselleHero
          hero={invitation.hero}
          openingImage={openingImage}
          openingMediaSource={openingMediaSource}
        />
        <InvitationOpeningIdentity invitation={invitation} template="roselle" />
        {personalSlots?.greeting ? (
          <div
            aria-label="Sapaan untuk tamu"
            className={styles.personalGreeting}
            data-roselle-addressed-letter
            data-roselle-chapter="greeting"
            data-template-personal-greeting="roselle"
            id="roselle-personal-greeting"
            role="region"
          >
            {personalSlots.greeting}
          </div>
        ) : null}
        <a data-invitation-opening-action data-roselle-opening-action href="#roselle-couple-title">
          <span>Buka undangan</span>
          <i aria-hidden="true" />
        </a>
      </div>
      <div className={styles.content}>
        <RoselleCouple couple={invitation.couple} />
        <RoselleStory story={invitation.story} storyImage={storyImage} />
        {hasScheduleJourney ? (
          <div
            aria-label="Jadwal dan lokasi perayaan"
            data-invitation-schedule-journey="roselle"
            data-roselle-celebration-thread
            role="group"
          >
            <RoselleEvents events={invitation.events} />
            {invitation.events ? (
              <TemplateEventJourneyUtility
                events={invitation.events.items}
                templateKey="roselle"
                timeZone={invitation.timezone}
              />
            ) : null}
            <RoselleLocation location={invitation.location} />
          </div>
        ) : null}
        <RoselleWeddingFilm weddingFilm={weddingFilm} />
        <RoselleGallery gallery={invitation.gallery} />
        <RoselleDigitalGift digitalGift={invitation.digitalGift} />
        {hasPersonalResponse ? (
          <div
            className={styles.personalResponseJourney}
            data-roselle-chapter="response"
            data-template-response-journey="roselle"
          >
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
              <div className={styles.personalResponseSection} data-template-response-slot="guestbook">
                <p aria-hidden="true" data-roselle-response-step>
                  Langkah {guestbookStepNumber} dari {responseStepCount}
                </p>
                {personalSlots.guestbook}
              </div>
            ) : null}
          </div>
        ) : null}
        {showGenericResponseNote ? (
          <p
            className={styles.genericResponseNote}
            data-generic-response-note="roselle"
            data-roselle-generic-note
          >
            {genericResponseCopy}
          </p>
        ) : null}
        <div className={marketFloorStyles.farewell} data-roselle-farewell="market-floor-v1">
          <InvitationIdentityFooter invitation={invitation} template="roselle" />
          <RoselleClosing closing={invitation.closing} />
          <a
            data-invitation-return-action
            data-roselle-return-to-opening
            href="#roselle-invitation-title"
          >
            <span aria-hidden="true">↑</span>
            Kembali ke awal
          </a>
        </div>
      </div>
    </article>
  );
}
