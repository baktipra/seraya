import type { InvitationDraftContent } from '@/modules/invitations/invitation-draft.schema';

import type { InvitationGalleryImage } from '@/modules/media/media.types';

import { formatInvitationDate, formatInvitationTime } from './invitation-date-formatters';

export type InvitationPersonViewModel = {
  displayName: string;
  fullName: string | null;
  parentLine: string | null;
};

export type InvitationEventPartViewModel = {
  dateLabel: string | null;
  timeLabel: string | null;
  title: string | null;
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
  events: {
    ceremony: InvitationEventPartViewModel | null;
    primaryDateLabel: string | null;
    reception: InvitationEventPartViewModel | null;
  } | null;
  gallery: InvitationGalleryViewModel | null;
  hero: {
    eyebrow: string | null;
    primaryDateLabel: string | null;
    subtitle: string | null;
    title: string;
  };
  location: InvitationLocationViewModel | null;
  rsvp: {
    heading: string;
    lead: string;
  } | null;
  story: {
    body: string | null;
    heading: string | null;
  } | null;
};

export type InvitationRendererProjectMetadata = {
  event_date_primary: string | null;
};

type InvitationViewModelInput = {
  draft: Pick<{ content: InvitationDraftContent }, 'content'>;
  galleryImages?: InvitationGalleryImage[];
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

function createEventPartViewModel(part: InvitationDraftContent['events']['ceremony']) {
  if (!part.enabled || (!part.title && !part.date && !part.startTime && !part.endTime)) {
    return null;
  }

  return {
    dateLabel: formatInvitationDate(part.date),
    timeLabel: formatTimeRange(part.startTime, part.endTime),
    title: part.title,
  } satisfies InvitationEventPartViewModel;
}

function getSafeHttpsHref(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).protocol === 'https:' ? value : null;
  } catch {
    return null;
  }
}

/**
 * The sole data mapping boundary between validated invitation content and visual
 * templates. It accepts no database client and exposes plain React text only.
 */
export function createInvitationViewModel({
  draft,
  galleryImages = [],
  project,
}: InvitationViewModelInput) {
  const { content } = draft;
  const primaryDate = content.events.primaryDate ?? project.event_date_primary;
  const primaryDateLabel = formatInvitationDate(primaryDate);
  const ceremony = createEventPartViewModel(content.events.ceremony);
  const reception = createEventPartViewModel(content.events.reception);
  const hasEventContent = Boolean(primaryDateLabel || ceremony || reception);
  const mapsHref = getSafeHttpsHref(content.location.mapsUrl);
  const hasLocationContent = Boolean(
    content.location.venueName || content.location.address || mapsHref,
  );

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
      },
      personTwo: {
        displayName: content.couple.personTwo.displayName,
        fullName: content.couple.personTwo.fullName,
        parentLine: content.couple.personTwo.parentLine,
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
    events:
      content.events.enabled && hasEventContent
        ? {
            ceremony,
            primaryDateLabel,
            reception,
          }
        : null,
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
    location:
      content.location.enabled && hasLocationContent
        ? {
            address: content.location.address,
            mapsHref,
            venueName: content.location.venueName,
          }
        : null,
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
  } satisfies InvitationViewModel;
}
