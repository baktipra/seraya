import { isLegacyEventScheduleDerived } from '@/modules/invitations/invitation-draft-legacy-schedule';
import type {
  EventScheduleItemV1,
  InvitationDraftContent,
} from '@/modules/invitations/invitation-draft.schema';

import type { InvitationGalleryImage } from '@/modules/media/media.types';

import { formatInvitationDate, formatInvitationTime } from './invitation-date-formatters';

export type InvitationPersonViewModel = {
  displayName: string;
  fullName: string | null;
  parentLine: string | null;
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
  livestreamEnabled?: boolean;
  livestreamHeading?: string | null;
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
  // Modern multi-event schedules render venue details inside each event item.
  // This remains only for a legacy normalized document, preserving its old
  // separate location presentation until that owner explicitly saves again.
  location: InvitationLocationViewModel | null;
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
    livestreamEnabled: event.livestreamEnabled === true,
    livestreamHeading: event.livestreamHeading ?? null,
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
    livestreamEnabled: false,
    livestreamHeading: null,
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
  project,
}: InvitationViewModelInput) {
  const { content } = draft;
  const isLegacySchedule = isLegacyEventScheduleDerived(content);
  const legacyPrimaryDate = content.events.primaryDate ?? project.event_date_primary;
  const modernPrimaryDate = content.eventSchedule.events[0]?.date ?? null;
  const primaryDate = isLegacySchedule ? legacyPrimaryDate : modernPrimaryDate;
  const primaryDateLabel = formatInvitationDate(primaryDate);
  const legacyCeremony = createLegacyEventPartViewModel(content.events.ceremony, 'legacy-ceremony');
  const legacyReception = createLegacyEventPartViewModel(
    content.events.reception,
    'legacy-reception',
  );
  const legacyItems = [legacyCeremony, legacyReception].filter(
    (event): event is InvitationScheduleItemViewModel => event !== null,
  );
  const modernItems = content.eventSchedule.events.map(createScheduleItemViewModel);
  const hasLegacyEventContent = Boolean(primaryDateLabel || legacyItems.length > 0);
  const events = isLegacySchedule
    ? content.events.enabled && hasLegacyEventContent
      ? {
          items: legacyItems,
          primaryDateLabel,
        }
      : null
    : {
        items: modernItems,
        primaryDateLabel,
      };

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
    events,
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
