import { describe, expect, it } from 'vitest';

import {
  getInvitationEditorChapterForField,
  getInvitationEditorChapterStatuses,
  invitationEditorChapters,
} from '@/modules/invitation-editor/editor-chapter-registry';
import { getInvitationEditorTruthState } from '@/modules/invitation-editor/editor-truth-state';
import { createDefaultInvitationDraftContent } from '@/modules/invitations/invitation-draft.defaults';

const project = {
  account_id: '11111111-1111-1111-1111-111111111111',
  default_timezone: 'Asia/Jakarta',
  deleted_at: null,
  event_city: 'Jakarta',
  event_date_primary: '2027-08-17',
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  person_one_name: 'Raka',
  person_two_name: 'Nadia',
  slug: 'raka-nadia',
  status: 'draft',
};

const readiness = {
  identity: { coupleLabel: 'Raka & Nadia', templateKey: 'roselle' as const },
  invitation: {
    hasPublishedSnapshot: false,
    hasUnpublishedChanges: false,
    hasVerifiedActivation: false,
    publishedSlug: null,
    state: 'draft_incomplete' as const,
  },
};

describe('Release B editor studio foundation', () => {
  it('uses the locked canonical chapter order and preview targets', () => {
    expect(invitationEditorChapters.map(({ id, label }) => [id, label])).toEqual([
      ['style', 'Desain'],
      ['opening', 'Sampul'],
      ['couple', 'Mempelai'],
      ['story', 'Cerita'],
      ['schedule', 'Acara'],
      ['gallery', 'Galeri'],
      ['gift', 'Amplop Digital'],
      ['rsvp', 'Respons Tamu'],
      ['closing', 'Penutup'],
    ]);

    expect(invitationEditorChapters.map((chapter) => chapter.previewTarget)).toEqual([
      'opening',
      'opening',
      'couple',
      'story',
      'events',
      'gallery',
      'digital-gift',
      'responses',
      'closing',
    ]);
  });

  it('maps every editable content family to one canonical chapter', () => {
    expect(getInvitationEditorChapterForField('templateKey')).toBe('style');
    expect(getInvitationEditorChapterForField('hero.title')).toBe('opening');
    expect(getInvitationEditorChapterForField('couple.personOne.displayName')).toBe('couple');
    expect(getInvitationEditorChapterForField('story.body')).toBe('story');
    expect(getInvitationEditorChapterForField('eventSchedule.events.0.title')).toBe('schedule');
    expect(getInvitationEditorChapterForField('gallery.imageIds')).toBe('gallery');
    expect(getInvitationEditorChapterForField('digitalGift.accounts.0.accountNumber')).toBe('gift');
    expect(getInvitationEditorChapterForField('rsvp.heading')).toBe('rsvp');
    expect(getInvitationEditorChapterForField('closing.message')).toBe('closing');
  });

  it('derives chapter progress from the current editor document', () => {
    const content = createDefaultInvitationDraftContent(project);
    const initial = getInvitationEditorChapterStatuses(content);

    expect(initial.style).toBe('complete');
    expect(initial.couple).toBe('complete');
    expect(initial.gallery).toBe('optional_off');

    const changed = getInvitationEditorChapterStatuses({
      ...content,
      couple: {
        ...content.couple,
        personOne: { ...content.couple.personOne, displayName: '' },
      },
    });

    expect(changed.couple).toBe('incomplete');
  });

  it('never confuses local changes, saved draft, and published snapshot', () => {
    const truth = getInvitationEditorTruthState({
      actionStatus: 'idle',
      hasSaved: false,
      isDirty: true,
      isPending: false,
      readiness,
    });

    expect(truth.local).toMatchObject({ label: 'Ada perubahan', state: 'dirty' });
    expect(truth.saved).toMatchObject({ label: 'Versi sebelumnya', state: 'not_saved' });
    expect(truth.published).toMatchObject({ label: 'Belum diterbitkan', state: 'not_published' });
  });

  it('marks the live snapshot as outdated when a published project has newer draft changes', () => {
    const truth = getInvitationEditorTruthState({
      actionStatus: 'success',
      hasSaved: true,
      isDirty: false,
      isPending: false,
      readiness: {
        ...readiness,
        invitation: {
          ...readiness.invitation,
          hasPublishedSnapshot: true,
          hasUnpublishedChanges: true,
          publishedSlug: 'raka-nadia',
          state: 'published_with_unpublished_changes',
        },
      },
    });

    expect(truth.local).toMatchObject({ state: 'clean' });
    expect(truth.saved).toMatchObject({ state: 'saved' });
    expect(truth.published).toMatchObject({
      label: 'Perlu diterbitkan ulang',
      state: 'outdated',
    });
  });
});
