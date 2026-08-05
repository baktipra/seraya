import type { InvitationViewModel } from './invitation-view-model';

import styles from './invitation-atmosphere-identity.module.css';

type InvitationIdentityTemplate = 'aruna' | 'laras' | 'roselle';

type InvitationAtmosphereIdentityProps = {
  invitation: InvitationViewModel;
  showMonogram?: boolean;
  template: InvitationIdentityTemplate;
};

export function InvitationOpeningIdentity({
  invitation,
  showMonogram = true,
  template,
}: InvitationAtmosphereIdentityProps) {
  const monogram = showMonogram ? invitation.identity?.monogram : null;
  const shortName = invitation.identity?.shortName ?? null;
  const opening = invitation.opening ?? null;

  if (!monogram && !shortName && !opening) {
    return null;
  }

  return (
    <section
      aria-label="Suasana pembuka pasangan"
      className={styles.opening}
      data-invitation-identity-opening={template}
      data-opening-treatment={opening?.treatment ?? 'soft'}
      data-template={template}
    >
      {monogram ? (
        <p
          aria-label={`Monogram pasangan ${monogram.text}`}
          className={styles.monogram}
          data-monogram-style={monogram.style}
        >
          {monogram.text}
        </p>
      ) : null}
      {shortName ? <p className={styles.shortName}>{shortName}</p> : null}
      {opening?.message ? <p className={styles.message}>{opening.message}</p> : null}
      {opening?.quote ? <blockquote className={styles.quote}>{opening.quote}</blockquote> : null}
    </section>
  );
}

export function InvitationIdentityFooter({
  invitation,
  template,
}: Omit<InvitationAtmosphereIdentityProps, 'showMonogram'>) {
  const identity = invitation.identity ?? null;

  if (!identity?.weddingHashtag && !identity?.socialLinks.length) {
    return null;
  }

  return (
    <footer
      aria-label="Identitas dan tautan pasangan"
      className={styles.footer}
      data-invitation-identity-footer={template}
      data-template={template}
    >
      {identity.weddingHashtag ? <p className={styles.hashtag}>{identity.weddingHashtag}</p> : null}
      {identity.socialLinks.length > 0 ? (
        <nav aria-label="Tautan pasangan" className={styles.socialLinks}>
          {identity.socialLinks.map((link) => (
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
    </footer>
  );
}
