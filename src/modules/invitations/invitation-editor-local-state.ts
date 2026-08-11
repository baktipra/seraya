import { resolveInvitationThemePaletteKey } from '@/modules/invitation-templates/core/theme-package.registry';
import type { InvitationTemplateKey } from '@/modules/invitation-templates/invitation-template.keys';
import {
  createInvitationViewModel,
  type InvitationRendererProjectMetadata,
} from '@/modules/invitation-templates/invitation-view-model';
import type { InvitationPremiumMediaImages } from '@/modules/media/invitation-image.types';
import type { InvitationGalleryImage } from '@/modules/media/media.types';

import type { InvitationDraftContent } from './invitation-draft.schema';

type HeroField = keyof InvitationDraftContent['hero'];
type PersonField = keyof InvitationDraftContent['couple']['personOne'];
type OpeningField = keyof InvitationDraftContent['opening'];
type CoupleIdentityField = 'shortName' | 'weddingHashtag';
type CoupleMonogramField = keyof InvitationDraftContent['coupleIdentity']['monogram'];
type CoupleSocialField = keyof InvitationDraftContent['coupleIdentity']['socialLinks'];
type StoryField = keyof InvitationDraftContent['story'];
type RsvpField = keyof InvitationDraftContent['rsvp'];
type DigitalGiftField = Exclude<keyof InvitationDraftContent['digitalGift'], 'accounts'>;
type ClosingField = keyof InvitationDraftContent['closing'];

export type InvitationEditorLocalAction =
  | { content: InvitationDraftContent; type: 'replace' }
  | { paletteKey: string; type: 'palette' }
  | { templateKey: InvitationTemplateKey; type: 'template' }
  | { field: HeroField; type: 'hero'; value: string | null }
  | { field: OpeningField; type: 'opening-atmosphere'; value: string | null }
  | {
      field: PersonField;
      person: 'personOne' | 'personTwo';
      type: 'person';
      value: string | null;
    }
  | {
      field: CoupleIdentityField;
      type: 'couple-identity';
      value: string | null;
    }
  | {
      field: CoupleMonogramField;
      type: 'couple-monogram';
      value: boolean | string | null;
    }
  | {
      field: CoupleSocialField;
      type: 'couple-social';
      value: string | null;
    }
  | {
      field: StoryField;
      type: 'story';
      value: boolean | string | null;
    }
  | {
      events: InvitationDraftContent['eventSchedule']['events'];
      type: 'schedule';
    }
  | {
      enabled: boolean;
      type: 'gallery-visibility';
    }
  | {
      imageIds: string[];
      type: 'gallery-assets';
    }
  | {
      audio: InvitationDraftContent['audio'];
      type: 'audio-asset';
    }
  | {
      field: RsvpField;
      type: 'rsvp';
      value: boolean | string | null;
    }
  | {
      field: DigitalGiftField;
      type: 'digital-gift';
      value: boolean | string | null;
    }
  | {
      accounts: InvitationDraftContent['digitalGift']['accounts'];
      type: 'digital-gift-accounts';
    }
  | {
      field: ClosingField;
      type: 'closing';
      value: boolean | string | null;
    };

export function invitationEditorLocalContentReducer(
  content: InvitationDraftContent,
  action: InvitationEditorLocalAction,
): InvitationDraftContent {
  switch (action.type) {
    case 'replace':
      return action.content;
    case 'palette':
      return { ...content, paletteKey: action.paletteKey };
    case 'template':
      return {
        ...content,
        paletteKey: resolveInvitationThemePaletteKey(action.templateKey, undefined),
        templateKey: action.templateKey,
      };
    case 'hero':
      return {
        ...content,
        hero: { ...content.hero, [action.field]: action.value },
      } as InvitationDraftContent;
    case 'opening-atmosphere':
      return {
        ...content,
        opening: { ...content.opening, [action.field]: action.value },
      } as InvitationDraftContent;
    case 'couple-identity':
      return {
        ...content,
        coupleIdentity: { ...content.coupleIdentity, [action.field]: action.value },
      } as InvitationDraftContent;
    case 'couple-monogram':
      return {
        ...content,
        coupleIdentity: {
          ...content.coupleIdentity,
          monogram: {
            ...content.coupleIdentity.monogram,
            [action.field]: action.value,
          },
        },
      } as InvitationDraftContent;
    case 'couple-social':
      return {
        ...content,
        coupleIdentity: {
          ...content.coupleIdentity,
          socialLinks: {
            ...content.coupleIdentity.socialLinks,
            [action.field]: action.value,
          },
        },
      } as InvitationDraftContent;
    case 'person':
      return {
        ...content,
        couple: {
          ...content.couple,
          [action.person]: {
            ...content.couple[action.person],
            [action.field]: action.value,
          },
        },
      } as InvitationDraftContent;
    case 'story':
      return {
        ...content,
        story: { ...content.story, [action.field]: action.value },
      } as InvitationDraftContent;
    case 'schedule':
      return {
        ...content,
        eventSchedule: { events: action.events },
      };
    case 'gallery-visibility':
      return {
        ...content,
        gallery: { ...content.gallery, enabled: action.enabled },
      };
    case 'gallery-assets':
      return {
        ...content,
        gallery: { ...content.gallery, imageIds: action.imageIds },
      };
    case 'audio-asset':
      return {
        ...content,
        audio: action.audio,
      };
    case 'rsvp':
      return {
        ...content,
        rsvp: { ...content.rsvp, [action.field]: action.value },
      } as InvitationDraftContent;
    case 'digital-gift':
      return {
        ...content,
        digitalGift: { ...content.digitalGift, [action.field]: action.value },
      } as InvitationDraftContent;
    case 'digital-gift-accounts':
      return {
        ...content,
        digitalGift: { ...content.digitalGift, accounts: action.accounts },
      };
    case 'closing':
      return {
        ...content,
        closing: { ...content.closing, [action.field]: action.value },
      } as InvitationDraftContent;
  }
}

export function createInvitationEditorSubmissionPayload(content: InvitationDraftContent) {
  return {
    closing: {
      enabled: content.closing.enabled,
      message: content.closing.message,
      signature: content.closing.signature,
    },
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
    coupleIdentity: {
      monogram: {
        enabled: content.coupleIdentity.monogram.enabled,
        style: content.coupleIdentity.monogram.style,
        text: content.coupleIdentity.monogram.text,
      },
      shortName: content.coupleIdentity.shortName,
      socialLinks: {
        instagram: content.coupleIdentity.socialLinks.instagram,
        tiktok: content.coupleIdentity.socialLinks.tiktok,
        website: content.coupleIdentity.socialLinks.website,
      },
      weddingHashtag: content.coupleIdentity.weddingHashtag,
    },
    digitalGift: {
      accounts: content.digitalGift.accounts.map((account) => ({
        accountHolder: account.accountHolder,
        accountNumber: account.accountNumber,
        id: account.id,
        providerName: account.providerName,
      })),
      enabled: content.digitalGift.enabled,
      heading: content.digitalGift.heading,
      lead: content.digitalGift.lead,
    },
    eventSchedule: {
      events: content.eventSchedule.events.map((event) => ({
        arrivalNote: event.arrivalNote ?? '',
        countdownEnabled: event.countdownEnabled !== false,
        date: event.date,
        endTime: event.endTime,
        id: event.id,
        latitude: event.latitude?.toString() ?? '',
        livestreamDescription: event.livestreamDescription ?? '',
        livestreamEnabled: event.livestreamEnabled === true,
        livestreamHeading: event.livestreamHeading ?? '',
        livestreamPostEventMode: event.livestreamPostEventMode ?? 'recording',
        livestreamPreEventMessage: event.livestreamPreEventMessage ?? '',
        livestreamUrl: event.livestreamUrl ?? '',
        locationSource: event.locationSource ?? '',
        longitude: event.longitude?.toString() ?? '',
        mapsUrl: event.mapsUrl,
        placeId: event.placeId ?? '',
        startTime: event.startTime,
        title: event.title,
        venueAddress: event.venueAddress,
        venueName: event.venueName,
      })),
    },
    gallery: {
      enabled: content.gallery.enabled,
    },
    hero: {
      eyebrow: content.hero.eyebrow,
      subtitle: content.hero.subtitle,
      title: content.hero.title,
    },
    opening: {
      message: content.opening.message,
      quote: content.opening.quote,
      treatment: content.opening.treatment,
    },
    rsvp: {
      enabled: content.rsvp.enabled,
      heading: content.rsvp.heading,
      lead: content.rsvp.lead,
    },
    story: {
      body: content.story.body,
      enabled: content.story.enabled,
      heading: content.story.heading,
    },
    paletteKey: content.paletteKey,
    templateKey: content.templateKey,
  };
}

function createOwnerPreviewPremiumMediaImages(
  content: InvitationDraftContent,
): InvitationPremiumMediaImages {
  function image(id: string | null, alt: string) {
    return id ? { alt, id, src: `/dashboard/media/${id}` } : null;
  }

  return {
    cover: image(content.premiumMedia.coverImageId, 'Foto cover pasangan'),
    personOne: image(content.premiumMedia.personOne.imageId, 'Potret mempelai pertama'),
    personTwo: image(content.premiumMedia.personTwo.imageId, 'Potret mempelai kedua'),
    story: image(content.premiumMedia.storyImageId, 'Foto cerita pasangan'),
  };
}

export function createInvitationEditorPreviewViewModel(input: {
  content: InvitationDraftContent;
  galleryImages: InvitationGalleryImage[];
  project: InvitationRendererProjectMetadata;
}) {
  return createInvitationViewModel({
    draft: { content: input.content },
    galleryImages: input.galleryImages,
    premiumMediaImages: createOwnerPreviewPremiumMediaImages(input.content),
    project: input.project,
  });
}
