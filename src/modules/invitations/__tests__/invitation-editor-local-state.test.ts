import { describe, expect, it } from 'vitest';

import { createDefaultInvitationDraftContent } from '../invitation-draft.defaults';
import {
  createInvitationEditorPreviewViewModel,
  invitationEditorLocalContentReducer,
} from '../invitation-editor-local-state';

const project = {
  default_timezone: 'Asia/Jakarta',
  event_date_primary: '2027-08-17',
  person_one_name: 'Raka',
  person_two_name: 'Nadia',
};

describe('Slice C local invitation editor state', () => {
  it('resets the palette when changing theme and accepts a palette action', () => {
    const savedContent = createDefaultInvitationDraftContent(project);
    const aruna = invitationEditorLocalContentReducer(savedContent, {
      templateKey: 'aruna',
      type: 'template',
    });
    expect(aruna.paletteKey).toBe('stone');

    const matcha = invitationEditorLocalContentReducer(aruna, {
      paletteKey: 'matcha',
      type: 'palette',
    });
    expect(matcha.paletteKey).toBe('matcha');
  });

  it('updates incomplete local text immediately without mutating the saved draft input', () => {
    const savedContent = createDefaultInvitationDraftContent(project);
    const localContent = invitationEditorLocalContentReducer(savedContent, {
      field: 'title',
      type: 'hero',
      value: 'Judul yang masih lokal',
    });
    const preview = createInvitationEditorPreviewViewModel({
      content: localContent,
      galleryImages: [],
      project,
    });

    expect(preview.hero.title).toBe('Judul yang masih lokal');
    expect(savedContent.hero.title).not.toBe('Judul yang masih lokal');

    const incompleteContent = invitationEditorLocalContentReducer(localContent, {
      events: [{ ...localContent.eventSchedule.events[0]!, date: '', startTime: '', title: '' }],
      type: 'schedule',
    });
    const incompletePreview = createInvitationEditorPreviewViewModel({
      content: incompleteContent,
      galleryImages: [],
      project,
    });

    expect(incompletePreview.events?.primaryDateLabel).toBeNull();
    expect(incompletePreview.events?.items[0]).toMatchObject({
      dateLabel: null,
      timeLabel: null,
      title: '',
    });
  });

  it('switches templates nondestructively in local state', () => {
    const savedContent = createDefaultInvitationDraftContent(project);
    const localContent = invitationEditorLocalContentReducer(savedContent, {
      templateKey: 'laras',
      type: 'template',
    });

    expect(localContent.templateKey).toBe('laras');
    expect({
      ...localContent,
      paletteKey: savedContent.paletteKey,
      templateKey: savedContent.templateKey,
    }).toEqual(savedContent);
  });

  it('can render only the owner-authorized media supplied by the server load', () => {
    const savedContent = createDefaultInvitationDraftContent(project);
    const localContent = {
      ...savedContent,
      gallery: {
        enabled: true,
        imageIds: ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'],
      },
    };
    const preview = createInvitationEditorPreviewViewModel({
      content: localContent,
      galleryImages: [
        {
          alt: 'Foto privat milik pasangan',
          id: '11111111-1111-4111-8111-111111111111',
          src: '/dashboard/media/11111111-1111-4111-8111-111111111111',
        },
      ],
      project,
    });

    expect(preview.gallery?.images).toEqual([
      {
        alt: 'Foto privat milik pasangan',
        id: '11111111-1111-4111-8111-111111111111',
        src: '/dashboard/media/11111111-1111-4111-8111-111111111111',
      },
    ]);
  });
});
