import { isLegacyEventScheduleDerived } from '@/modules/invitations/invitation-draft-legacy-schedule';
import type {
  EventScheduleItemV1,
  InvitationDraftContent,
} from '@/modules/invitations/invitation-draft.schema';
import type { InvitationPremiumMediaImages } from '@/modules/media/invitation-image.types';
import type { InvitationGalleryImage } from '@/modules/media/media.types';

import { formatInvitationDate, formatInvitationTime } from './invitation-date-formatters';
import { getYoutubeEmbedHref, getYoutubeWatchHref } from './guest-event-utility-core';

export type InvitationSocialLinkViewModel = {
  href: string;
  label: 'Instagram' | 'TikTok' | 'Website';
  provider: 'instagram' | 'tiktok' | 'website';
};

export type InvitationPersonViewModel = {
  displayName: string;
  fullName: string | null;
  parentLine: string | null;
  portrait?: InvitationGalleryImage | null;
  socialLinks?: InvitationSocialLinkViewModel[];
};

export type InvitationScheduleItemViewModel = {
  address: string | null;
  arrivalNote?: string | null;
  countdownEnabled?: boolean;
  date?: string | null;
  dateLabel: string | null;
  endTime?: string | null;
  id?: string;
  latitude?: number | null;
  livestreamDescription?: string | null;
  livestreamEnabled?: boolean;
  livestreamHeading?: string | null;
  livestreamPostEventMode?: 'hide' | 'recording';
  livestreamPreEventMessage?: string | null;
  livestreamUrl?: string | null;
  locationSource?: 'current_location' | 'google_place' | 'manual_pin' | null;
  longitude?: number | null;
  mapsHref: string | null;
  placeId?: string | null;
  startTime?: string | null;
  timeLabel: string | null;
  title: string | null;
  venueName: string | null;
};

export type InvitationLocationViewModel = {
  address: string | null;
  mapsHref: string | null;
  venueName: string | null;
};

export type InvitationGalleryViewModel = {
  images: InvitationGalleryImage[];
};

export type InvitationDigitalGiftViewModel = {
  accounts: Array<{
    accountHolder: string;
    accountNumber: string;
    id: string;
    providerName: string;
  }>;
  heading: string;
  lead: string | null;
};

export type InvitationOpeningViewModel = {
  message: string | null;
  quote: string | null;
  treatment: 'soft' | 'editorial' | 'ceremonial';
};

export type InvitationIdentityViewModel = {
  monogram: {
    style: 'initials' | 'joined_initials' | 'wordmark';
    text: string;
  } | null;
  shortName: string | null;
  socialLinks: InvitationSocialLinkViewModel[];
  weddingHashtag: string | null;
};

export type InvitationPremiumMediaViewModel = {
  coverImage: InvitationGalleryImage | null;
  storyImage: InvitationGalleryImage | null;
  weddingFilm: {
    caption: string | null;
    embedHref: string;
    heading: string;
    watchHref: string;
  } | null;
};

export type InvitationViewModel = {
  closing: {
    message: string | null;
    signature: string | null;
  } | null;
  couple: {
    personOne: InvitationPersonViewModel;
    personTwo: InvitationPersonViewModel;
  };
  digitalGift: InvitationDigitalGiftViewModel | null;
  identity?: InvitationIdentityViewModel | null;
  events: {
    items: InvitationScheduleItemViewModel[];
    primaryDateLabel: string | null;
  } | null;
  gallery: InvitationGalleryViewModel | null;
  hero: {
    eyebrow: string | null;
    primaryDateLabel: string | null;
    subtitle: string | null;
    title: string;
  };
  location: InvitationLocationViewModel | null;
  opening?: InvitationOpeningViewModel | null;
  premiumMedia?: InvitationPremiumMediaViewModel;
  rsvp: {
    heading: string;
    lead: string;
  } | null;
  story: {
    body: string | null;
    heading: string | null;
  } | null;
  timezone?: string;
};

export type InvitationRendererProjectMetadata = {
  event_date_primary: string | null;
};

type InvitationViewModelInput = {
  draft: Pick<{ content: InvitationDraftContent }, 'content'>;
  galleryImages?: InvitationGalleryImage[];
  premiumMediaImages?: InvitationPremiumMediaImages;
  project: InvitationRendererProjectMetadata;
};

function formatTimeRange(startTime: string | null, endTime: string | null) {
  const formattedStartTime = formatInvitationTime(startTime);
  const formattedEndTime = formatInvitationTime(endTime);

  if (formattedStartTime && formattedEndTime) {
    return `${formattedStartTime}–${formattedEndTime}`;
  }

  return formattedStartTime ?? formattedEndTime;
}

function getSafeHttpsHref(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).protocol === 'https:' ? value : null;
  } catch {
    return null;
  }
}

function createSocialLinks(input: {
  instagram: string | null;
  tiktok: string | null;
  website: string | null;
}): InvitationSocialLinkViewModel[] {
  const socialLinks: InvitationSocialLinkViewModel[] = [];
  const instagram = getSafeHttpsHref(input.instagram);
  const tiktok = getSafeHttpsHref(input.tiktok);
  const website = getSafeHttpsHref(input.website);

  if (instagram) {
    socialLinks.push({ href: instagram, label: 'Instagram', provider: 'instagram' });
  }
  if (tiktok) {
    socialLinks.push({ href: tiktok, label: 'TikTok', provider: 'tiktok' });
  }
  if (website) {
    socialLinks.push({ href: website, label: 'Website', provider: 'website' });
  }

  return socialLinks;
}

function getInitial(value: string) {
  return value.trim().charAt(0).toLocaleUpperCase('id-ID');
}

function createIdentityViewModel(
  content: InvitationDraftContent,
): InvitationIdentityViewModel | null {
  const firstInitial = getInitial(content.couple.personOne.displayName);
  const secondInitial = getInitial(content.couple.personTwo.displayName);
  const fallbackText =
    content.coupleIdentity.monogram.style === 'joined_initials'
      ? `${firstInitial}${secondInitial}`
      : content.coupleIdentity.monogram.style === 'wordmark'
        ? (content.coupleIdentity.shortName ??
          `${content.couple.personOne.displayName} · ${content.couple.personTwo.displayName}`)
        : `${firstInitial} & ${secondInitial}`;
  const monogram = content.coupleIdentity.monogram.enabled
    ? {
        style: content.coupleIdentity.monogram.style,
        text: content.coupleIdentity.monogram.text ?? fallbackText,
      }
    : null;
  const socialLinks = createSocialLinks(content.coupleIdentity.socialLinks);
  const hasIdentity = Boolean(
    monogram ||
      content.coupleIdentity.shortName ||
      content.coupleIdentity.weddingHashtag ||
      socialLinks.length > 0,
  );

  return hasIdentity
    ? {
        monogram,
        shortName: content.coupleIdentity.shortName,
        socialLinks,
        weddingHashtag: content.coupleIdentity.weddingHashtag,
      }
    : null;
}

function createScheduleItemViewModel(event: EventScheduleItemV1): InvitationScheduleItemViewModel {
  return {
    address: event.venueAddress,
    arrivalNote: event.arrivalNote ?? null,
    countdownEnabled: event.countdownEnabled !== false,
    date: event.date,
    dateLabel: formatInvitationDate(event.date),
    endTime: event.endTime,
    id: event.id,
    latitude: event.latitude ?? null,
    livestreamDescription: event.livestreamDescription ?? null,
    livestreamEnabled: event.livestreamEnabled === true,
    livestreamHeading: event.livestreamHeading ?? null,
    livestreamPostEventMode: event.livestreamPostEventMode ?? 'recording',
    livestreamPreEventMessage: event.livestreamPreEventMessage ?? null,
    livestreamUrl: getSafeHttpsHref(event.livestreamUrl),
    locationSource: event.locationSource ?? null,
    longitude: event.longitude ?? null,
    mapsHref: getSafeHttpsHref(event.mapsUrl),
    placeId: event.placeId ?? null,
    startTime: event.startTime,
    timeLabel: formatTimeRange(event.startTime, event.endTime),
    title: event.title,
    venueName: event.venueName,
  };
}

function createLegacyEventPartViewModel(
  part: InvitationDraftContent['events']['ceremony'],
  id: string,
): InvitationScheduleItemViewModel | null {
  if (!part.enabled || (!part.title && !part.date && !part.startTime && !part.endTime)) {
    return null;
  }

  return {
    address: null,
    arrivalNote: null,
    countdownEnabled: true,
    date: part.date,
    dateLabel: formatInvitationDate(part.date),
    endTime: part.endTime,
    id,
    latitude: null,
    livestreamDescription: null,
    livestreamEnabled: false,
    livestreamHeading: null,
    livestreamPostEventMode: 'recording',
    livestreamPreEventMessage: null,
    livestreamUrl: null,
    locationSource: null,
    longitude: null,
    mapsHref: null,
    placeId: null,
    startTime: part.startTime,
    timeLabel: formatTimeRange(part.startTime, part.endTime),
    title: part.title,
    venueName: null,
  };
}

function createLegacyLocationViewModel(content: InvitationDraftContent) {
  const mapsHref = getSafeHttpsHref(content.location.mapsUrl);
  const hasLocationContent = Boolean(
    content.location.venueName || content.location.address || mapsHref,
  );

  return content.location.enabled && hasLocationContent
    ? {
        address: content.location.address,
        mapsHref,
        venueName: content.location.venueName,
      }
    : null;
}

/**
 * The sole data mapping boundary between validated invitation content and visual
 * templates. It accepts no database client, exposes public invitation content
 * only, and never includes guest names, tokens, RSVP state, or delivery data.
 */
export function createInvitationViewModel({
  draft,
  galleryImages = [],
  premiumMediaImages = { cover: null, personOne: null, personTwo: null, story: null },
  project,
}: InvitationViewModelInput) {
  const { content } = draft;
  const isLegacySchedule = isLegacyEventScheduleDerived(content);
  const legacyPrimaryDate = content.events.primaryDate ?? project.event_date_primary;
  const modernPrimaryDate = content.eventSchedule.events[0]?.date ?? null;
  const primaryDate = isLegacySchedule ? legacyPrimaryDate : modernPrimaryDate;
  const primaryDateLabel = formatInvitationDate(primaryDate);
  const legacyItems = [
    createLegacyEventPartViewModel(content.events.ceremony, 'legacy-ceremony'),
    createLegacyEventPartViewModel(content.events.reception, 'legacy-reception'),
  ].filter((event): event is InvitationScheduleItemViewModel => event !== null);
  const modernItems = content.eventSchedule.events.map(createScheduleItemViewModel);
  const hasLegacyEventContent = Boolean(primaryDateLabel || legacyItems.length > 0);
  const events = isLegacySchedule
    ? content.events.enabled && hasLegacyEventContent
      ? { items: legacyItems, primaryDateLabel }
      : null
    : { items: modernItems, primaryDateLabel };
  const identity = createIdentityViewModel(content);
  const opening =
    content.opening.message || content.opening.quote
      ? {
          message: content.opening.message,
          quote: content.opening.quote,
          treatment: content.opening.treatment,
        }
      : null;
  const weddingFilmEmbedHref = content.premiumMedia.weddingFilm.enabled
    ? getYoutubeEmbedHref(content.premiumMedia.weddingFilm.url)
    : null;
  const weddingFilmWatchHref = content.premiumMedia.weddingFilm.enabled
    ? getYoutubeWatchHref(content.premiumMedia.weddingFilm.url)
    : null;

  return {
    closing:
      content.closing.enabled && (content.closing.message || content.closing.signature)
        ? {
            message: content.closing.message,
            signature: content.closing.signature,
          }
        : null,
    couple: {
      personOne: {
        displayName: content.couple.personOne.displayName,
        fullName: content.couple.personOne.fullName,
        parentLine: content.couple.personOne.parentLine,
        portrait: premiumMediaImages.personOne,
        socialLinks: createSocialLinks(content.premiumMedia.personOne.socialLinks),
      },
      personTwo: {
        displayName: content.couple.personTwo.displayName,
        fullName: content.couple.personTwo.fullName,
        parentLine: content.couple.personTwo.parentLine,
        portrait: premiumMediaImages.personTwo,
        socialLinks: createSocialLinks(content.premiumMedia.personTwo.socialLinks),
      },
    },
    digitalGift:
      content.digitalGift.enabled && content.digitalGift.accounts.length > 0
        ? {
            accounts: content.digitalGift.accounts.map((account) => ({
              accountHolder: account.accountHolder,
              accountNumber: account.accountNumber,
              id: account.id,
              providerName: account.providerName,
            })),
            heading: content.digitalGift.heading ?? 'Amplop Digital',
            lead: content.digitalGift.lead,
          }
        : null,
    events,
    identity,
    gallery:
      content.gallery.enabled && galleryImages.length > 0
        ? {
            images: galleryImages,
          }
        : null,
    hero: {
      eyebrow: content.hero.eyebrow,
      primaryDateLabel,
      subtitle: content.hero.subtitle,
      title:
        content.hero.title ??
        `${content.couple.personOne.displayName} & ${content.couple.personTwo.displayName}`,
    },
    location: isLegacySchedule ? createLegacyLocationViewModel(content) : null,
    opening,
    premiumMedia: {
      coverImage: premiumMediaImages.cover,
      storyImage: premiumMediaImages.story,
      weddingFilm:
        weddingFilmEmbedHref && weddingFilmWatchHref
          ? {
              caption: content.premiumMedia.weddingFilm.caption,
              embedHref: weddingFilmEmbedHref,
              heading: content.premiumMedia.weddingFilm.heading ?? 'Wedding Film',
              watchHref: weddingFilmWatchHref,
            }
          : null,
    },
    rsvp: content.rsvp.enabled
      ? {
          heading: content.rsvp.heading ?? 'Konfirmasi Kehadiran',
          lead: content.rsvp.lead ?? 'Konfirmasi kehadiran akan segera tersedia.',
        }
      : null,
    story:
      content.story.enabled && (content.story.heading || content.story.body)
        ? {
            body: content.story.body,
            heading: content.story.heading,
          }
        : null,
    timezone: content.meta.timezone,
  } satisfies InvitationViewModel;
}
