import type { InvitationEditorFieldErrors } from '@/modules/invitations/invitation-editor.schema';
import type { InvitationDraftContent } from '@/modules/invitations/invitation-draft.schema';

export const invitationEditorChapters = [
  {
    key: 'style',
    label: 'Desain',
    legacyLabel: 'Gaya undangan',
    number: '01',
    optional: false,
    previewTarget: 'opening',
  },
  {
    key: 'opening',
    label: 'Sampul',
    legacyLabel: 'Pembuka',
    number: '02',
    optional: false,
    previewTarget: 'opening',
  },
  {
    key: 'couple',
    label: 'Mempelai',
    legacyLabel: 'Mempelai',
    number: '03',
    optional: false,
    previewTarget: 'couple',
  },
  {
    key: 'story',
    label: 'Cerita',
    legacyLabel: 'Cerita',
    number: '04',
    optional: true,
    previewTarget: 'story',
  },
  {
    key: 'schedule',
    label: 'Acara',
    legacyLabel: 'Rangkaian acara',
    number: '05',
    optional: false,
    previewTarget: 'events',
  },
  {
    key: 'gallery',
    label: 'Galeri',
    legacyLabel: 'Galeri',
    number: '06',
    optional: true,
    previewTarget: 'gallery',
  },
  {
    key: 'gift',
    label: 'Amplop Digital',
    legacyLabel: 'Amplop Digital',
    number: '07',
    optional: true,
    previewTarget: 'digital-gift',
  },
  {
    key: 'rsvp',
    label: 'Respons Tamu',
    legacyLabel: 'Konfirmasi tamu',
    number: '08',
    optional: true,
    previewTarget: 'response',
  },
  {
    key: 'closing',
    label: 'Penutup',
    legacyLabel: 'Penutup',
    number: '09',
    optional: true,
    previewTarget: 'closing',
  },
] as const;

export type InvitationEditorChapterKey = (typeof invitationEditorChapters)[number]['key'];
export type InvitationEditorPreviewTarget =
  (typeof invitationEditorChapters)[number]['previewTarget'];
export type InvitationEditorChapterStatus =
  | 'complete'
  | 'error'
  | 'incomplete'
  | 'optional_off';

export type InvitationEditorChapterStatuses = Record<
  InvitationEditorChapterKey,
  InvitationEditorChapterStatus
>;

const chapterFieldPrefixes: ReadonlyArray<{
  chapter: InvitationEditorChapterKey;
  matches: (fieldName: string) => boolean;
}> = [
  { chapter: 'style', matches: (fieldName) => fieldName === 'templateKey' },
  { chapter: 'opening', matches: (fieldName) => fieldName.startsWith('hero.') },
  { chapter: 'couple', matches: (fieldName) => fieldName.startsWith('couple.') },
  { chapter: 'story', matches: (fieldName) => fieldName.startsWith('story.') },
  { chapter: 'schedule', matches: (fieldName) => fieldName.startsWith('eventSchedule.') },
  {
    chapter: 'gallery',
    matches: (fieldName) => fieldName.startsWith('gallery.') || fieldName.startsWith('media.'),
  },
  {
    chapter: 'gift',
    matches: (fieldName) => fieldName.startsWith('digitalGift.'),
  },
  { chapter: 'rsvp', matches: (fieldName) => fieldName.startsWith('rsvp.') },
  { chapter: 'closing', matches: (fieldName) => fieldName.startsWith('closing.') },
];

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

export function getInvitationEditorChapter(
  chapterKey: InvitationEditorChapterKey,
) {
  return invitationEditorChapters.find((chapter) => chapter.key === chapterKey) ?? null;
}

export function getInvitationEditorChapterForField(
  fieldName: string,
): InvitationEditorChapterKey | null {
  return chapterFieldPrefixes.find(({ matches }) => matches(fieldName))?.chapter ?? null;
}

export function getInvitationEditorErrorChapters(errors?: InvitationEditorFieldErrors) {
  const chapters = new Set<InvitationEditorChapterKey>();

  for (const fieldName of Object.keys(errors ?? {})) {
    const chapter = getInvitationEditorChapterForField(fieldName);
    if (chapter) chapters.add(chapter);
  }

  return invitationEditorChapters
    .map((chapter) => chapter.key)
    .filter((chapter) => chapters.has(chapter));
}

export function getInvitationEditorChapterStatuses(
  content: InvitationDraftContent,
  errors?: InvitationEditorFieldErrors,
): InvitationEditorChapterStatuses {
  const firstEvent = content.eventSchedule.events[0];
  const errorChapters = new Set(getInvitationEditorErrorChapters(errors));

  const statuses: InvitationEditorChapterStatuses = {
    style: content.templateKey ? 'complete' : 'incomplete',
    opening: hasText(content.hero.title) ? 'complete' : 'incomplete',
    couple:
      hasText(content.couple.personOne.displayName) &&
      hasText(content.couple.personTwo.displayName)
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
      content.gallery.enabled && content.gallery.imageIds.length > 0
        ? 'complete'
        : 'optional_off',
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

  for (const chapter of errorChapters) {
    statuses[chapter] = 'error';
  }

  return statuses;
}
