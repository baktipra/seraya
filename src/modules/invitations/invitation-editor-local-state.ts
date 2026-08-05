import { resolveInvitationThemePaletteKey } from '@/modules/invitation-templates/core/theme-package.registry';
import type { InvitationTemplateKey } from '@/modules/invitation-templates/invitation-template.keys';
import {
  createInvitationViewModel,
  type InvitationRendererProjectMetadata,
} from '@/modules/invitation-templates/invitation-view-model';
import type { InvitationGalleryImage } from '@/modules/media/media.types';

import type { InvitationDraftContent } from './invitation-draft.schema';

type HeroField = keyof InvitationDraftContent['hero'];
type PersonField = keyof InvitationDraftContent['couple']['personOne'];
type StoryField = keyof InvitationDraftContent['story'];
type RsvpField = keyof InvitationDraftContent['rsvp'];
type DigitalGiftField = Exclude<keyof InvitationDraftContent['digitalGift'], 'accounts'>;
type ClosingField = keyof InvitationDraftContent['closing'];

export type InvitationEditorLocalAction =
  | { content: InvitationDraftContent; type: 'replace' }
  | { paletteKey: string; type: 'palette' }
  | { templateKey: InvitationTemplateKey; type: 'template' }
  | { field: HeroField; type: 'hero'; value: string | null }
  | {
      field: PersonField;
      person: 'personOne' | 'personTwo';
      type: 'person';
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
        livestreamEnabled: event.livestreamEnabled === true,
        livestreamHeading: event.livestreamHeading ?? '',
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
    hero: {
      eyebrow: content.hero.eyebrow,
      subtitle: content.hero.subtitle,
      title: content.hero.title,
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

export function createInvitationEditorPreviewViewModel(input: {
  content: InvitationDraftContent;
  galleryImages: InvitationGalleryImage[];
  project: InvitationRendererProjectMetadata;
}) {
  return createInvitationViewModel({
    draft: { content: input.content },
    galleryImages: input.galleryImages,
    project: input.project,
  });
}
