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

/**
 * Browser-only invitation state. It deliberately mirrors the draft document
 * while keeping gallery membership, legacy compatibility fields, and metadata
 * outside the editable action surface.
 */
export function invitationEditorLocalContentReducer(
  content: InvitationDraftContent,
  action: InvitationEditorLocalAction,
): InvitationDraftContent {
  switch (action.type) {
    case 'replace':
      return action.content;
    case 'template':
      return { ...content, templateKey: action.templateKey };
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

/**
 * Client-safe bridge into the shared template view model. The only media it
 * can expose are render-safe URLs supplied by the owner-authorized server load.
 */
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
