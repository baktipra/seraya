import type { InvitationTemplateKey } from '../invitation-template.keys';
import type {
  InvitationSocialLinkViewModel,
  InvitationViewModel,
} from '../invitation-view-model';

const SHOWROOM_ASSET_ROOT = '/showroom/kirana-arga';

export const ROSELLE_PREMIUM_SHOWROOM_MEDIA = {
  cover: {
    alt: 'Potret pembuka Kirana dan Arga untuk showroom Seraya',
    id: '00000000-0000-4000-8000-000000000701',
    src: `${SHOWROOM_ASSET_ROOT}/kirana-arga-opening-portrait.avif`,
  },
  personOne: {
    alt: 'Potret Kirana untuk showroom Seraya',
    id: '00000000-0000-4000-8000-000000000702',
    src: `${SHOWROOM_ASSET_ROOT}/kirana-arga-opening-portrait.avif`,
  },
  personTwo: {
    alt: 'Potret Arga untuk showroom Seraya',
    id: '00000000-0000-4000-8000-000000000703',
    src: `${SHOWROOM_ASSET_ROOT}/kirana-arga-opening-portrait.avif`,
  },
  story: {
    alt: 'Potret cerita Kirana dan Arga untuk showroom Seraya',
    id: '00000000-0000-4000-8000-000000000704',
    src: `${SHOWROOM_ASSET_ROOT}/kirana-arga-environmental-wide.avif`,
  },
} as const;

const KIRANA_SOCIAL_LINKS: InvitationSocialLinkViewModel[] = [
  {
    href: 'https://www.instagram.com/',
    label: 'Instagram',
    provider: 'instagram',
  },
  {
    href: 'https://example.com/kirana',
    label: 'Website',
    provider: 'website',
  },
];

const ARGA_SOCIAL_LINKS: InvitationSocialLinkViewModel[] = [
  {
    href: 'https://www.tiktok.com/',
    label: 'TikTok',
    provider: 'tiktok',
  },
  {
    href: 'https://example.com/arga',
    label: 'Website',
    provider: 'website',
  },
];

const ROSELLE_SHOWROOM_WEDDING_FILM = {
  caption:
    'Demo integrasi Wedding Film · referensi Creative Commons “The Joyful Rhythms of a Kashmiri Wedding”, Indian Diplomacy (CC BY 3.0). Pada undangan pelanggan, film berasal dari YouTube pasangan.',
  embedHref: 'https://www.youtube-nocookie.com/embed/n0hH4xfEyH0',
  heading: 'A film about the celebration',
  watchHref: 'https://www.youtube.com/watch?v=n0hH4xfEyH0',
} as const;

/**
 * Showroom-only activation layer for proving J1.3 premium guest media with the
 * real Roselle renderer. It never enters owner drafts or published snapshots.
 */
export function activateRosellePremiumShowroom(
  invitation: InvitationViewModel,
  templateKey: InvitationTemplateKey,
): InvitationViewModel {
  if (templateKey !== 'roselle') {
    return invitation;
  }

  return {
    ...invitation,
    couple: {
      personOne: {
        ...invitation.couple.personOne,
        portrait: ROSELLE_PREMIUM_SHOWROOM_MEDIA.personOne,
        socialLinks: KIRANA_SOCIAL_LINKS,
      },
      personTwo: {
        ...invitation.couple.personTwo,
        portrait: ROSELLE_PREMIUM_SHOWROOM_MEDIA.personTwo,
        socialLinks: ARGA_SOCIAL_LINKS,
      },
    },
    premiumMedia: {
      coverImage: ROSELLE_PREMIUM_SHOWROOM_MEDIA.cover,
      storyImage: ROSELLE_PREMIUM_SHOWROOM_MEDIA.story,
      weddingFilm: ROSELLE_SHOWROOM_WEDDING_FILM,
    },
  };
}
