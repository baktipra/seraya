import type { InvitationEditorFieldErrors } from '@/modules/invitations/invitation-editor.schema';
import type { InvitationDraftContent } from '@/modules/invitations/invitation-draft.schema';

export const invitationEditorChapterIds = [
  'style',
  'opening',
  'couple',
  'story',
  'schedule',
  'gallery',
  'gift',
  'rsvp',
  'closing',
] as const;

export type InvitationEditorChapterId = (typeof invitationEditorChapterIds)[number];
export type InvitationEditorChapterStatus =
  | 'complete'
  | 'error'
  | 'incomplete'
  | 'optional_off';

export type InvitationEditorPreviewTarget =
  | 'opening'
  | 'couple'
  | 'story'
  | 'events'
  | 'gallery'
  | 'digital-gift'
  | 'responses'
  | 'closing';

export type InvitationEditorChapterDefinition = {
  id: InvitationEditorChapterId;
  label: string;
  number: string;
  optional: boolean;
  previewTarget: InvitationEditorPreviewTarget;
};

export const invitationEditorChapters: readonly InvitationEditorChapterDefinition[] = [
  {
    id: 'style',
    label: 'Desain',
    number: '01',
    optional: false,
    previewTarget: 'opening',
  },
  {
    id: 'opening',
    label: 'Sampul',
    number: '02',
    optional: false,
    previewTarget: 'opening',
  },
  {
    id: 'couple',
    label: 'Mempelai',
    number: '03',
    optional: false,
    previewTarget: 'couple',
  },
  {
    id: 'story',
    label: 'Cerita',
    number: '04',
    optional: true,
    previewTarget: 'story',
  },
  {
    id: 'schedule',
    label: 'Acara',
    number: '05',
    optional: false,
    previewTarget: 'events',
  },
  {
    id: 'gallery',
    label: 'Galeri',
    number: '06',
    optional: true,
    previewTarget: 'gallery',
  },
  {
    id: 'gift',
    label: 'Amplop Digital',
    number: '07',
    optional: true,
    previewTarget: 'digital-gift',
  },
  {
    id: 'rsvp',
    label: 'Respons Tamu',
    number: '08',
    optional: true,
    previewTarget: 'responses',
  },
  {
    id: 'closing',
    label: 'Penutup',
    number: '09',
    optional: true,
    previewTarget: 'closing',
  },
] as const;

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

export function getInvitationEditorChapterForField(
  fieldName: string,
): InvitationEditorChapterId | null {
  if (fieldName === 'templateKey') return 'style';
  if (fieldName.startsWith('hero.')) return 'opening';
  if (fieldName.startsWith('couple.')) return 'couple';
  if (fieldName.startsWith('story.')) return 'story';
  if (fieldName.startsWith('eventSchedule.')) return 'schedule';
  if (fieldName.startsWith('gallery.')) return 'gallery';
  if (fieldName.startsWith('digitalGift.')) return 'gift';
  if (fieldName.startsWith('rsvp.')) return 'rsvp';
  if (fieldName.startsWith('closing.')) return 'closing';

  return null;
}

export function getInvitationEditorErrorChapters(errors?: InvitationEditorFieldErrors) {
  const chapters = new Set<InvitationEditorChapterId>();

  for (const fieldName of Object.keys(errors ?? {})) {
    const chapter = getInvitationEditorChapterForField(fieldName);
    if (chapter) chapters.add(chapter);
  }

  return invitationEditorChapters
    .map((chapter) => chapter.id)
    .filter((chapter) => chapters.has(chapter));
}

export function getInvitationEditorChapterStatuses(
  content: InvitationDraftContent,
  errors?: InvitationEditorFieldErrors,
): Record<InvitationEditorChapterId, InvitationEditorChapterStatus> {
  const errorChapters = new Set(getInvitationEditorErrorChapters(errors));
  const firstEvent = content.eventSchedule.events[0];

  const statuses: Record<InvitationEditorChapterId, InvitationEditorChapterStatus> = {
    style: content.templateKey ? 'complete' : 'incomplete',
    opening: hasText(content.hero.title) ? 'complete' : 'incomplete',
    couple:
      hasText(content.couple.personOne.displayName) && hasText(content.couple.personTwo.displayName)
        ? 'complete'
        : 'incomplete',
    story: !content.story.enabled
      ? 'optional_off'
      : hasText(content.story.heading) || hasText(content.story.body)
        ? 'complete'
        : 'incomplete',
    schedule:
      firstEvent &&
      content.eventSchedule.events.every(
        (event) => hasText(event.title) && hasText(event.date) && hasText(event.startTime),
      )
        ? 'complete'
        : 'incomplete',
    gallery:
      content.gallery.enabled && content.gallery.imageIds.length > 0 ? 'complete' : 'optional_off',
    gift: !content.digitalGift.enabled
      ? 'optional_off'
      : content.digitalGift.accounts.length > 0 &&
          content.digitalGift.accounts.every(
            (account) =>
              hasText(account.providerName) &&
              hasText(account.accountHolder) &&
              hasText(account.accountNumber),
          )
        ? 'complete'
        : 'incomplete',
    rsvp: !content.rsvp.enabled
      ? 'optional_off'
      : hasText(content.rsvp.heading) || hasText(content.rsvp.lead)
        ? 'complete'
        : 'incomplete',
    closing: !content.closing.enabled
      ? 'optional_off'
      : hasText(content.closing.message) || hasText(content.closing.signature)
        ? 'complete'
        : 'incomplete',
  };

  for (const chapter of errorChapters) statuses[chapter] = 'error';

  return statuses;
}
