import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import * as workspace from '@/components/projects/invitation-editor-workspace';
import * as defaults from '@/modules/invitations/invitation-draft.defaults';
import type { InvitationDraft } from '@/modules/invitations/invitation-draft.types';

const project = {
  default_timezone: 'Asia/Jakarta',
  event_date_primary: '2027-08-17',
  person_one_name: 'Raka',
  person_two_name: 'Nadia',
};

function createDraft(): InvitationDraft {
  return {
    content: defaults.createDefaultInvitationDraftContent(project),
    created_at: '2026-08-02T00:00:00.000Z',
    deleted_at: null,
    id: '11111111-1111-4111-8111-111111111111',
    project_id: '22222222-2222-4222-8222-222222222222',
    schema_version: 1,
    updated_at: '2026-08-02T00:00:00.000Z',
  };
}

describe('RB6 invitation editor chapter contracts', () => {
  it('keeps the canonical chapter journey', () => {
    const expected = [
      'style',
      'opening',
      'couple',
      'story',
      'schedule',
      'gallery',
      'gift',
      'rsvp',
      'closing',
    ];
    const errors = {
      'closing.message': 'Isi pesan.',
      'digitalGift.accounts': 'Tambahkan rekening.',
      'hero.title': 'Isi judul.',
      'rsvp.heading': 'Isi RSVP.',
    };
    const errorSections = workspace.getInvitationEditorErrorSections(errors);

    expect(workspace.canonicalInvitationEditorSectionKeys).toEqual(expected);
    expect(errorSections).toEqual(['opening', 'gift', 'rsvp', 'closing']);
  });

  it('maps fields to their owning chapters', () => {
    const cases = [
      ['templateKey', 'style'],
      ['hero.title', 'opening'],
      ['couple.personOne.displayName', 'couple'],
      ['story.body', 'story'],
      ['eventSchedule.events.0.date', 'schedule'],
      ['gallery.imageIds', 'gallery'],
      ['digitalGift.accounts', 'gift'],
      ['rsvp.heading', 'rsvp'],
      ['closing.signature', 'closing'],
    ] as const;

    for (const [field, section] of cases) {
      const result = workspace.getInvitationEditorSectionForField(field);
      expect(result).toBe(section);
    }

    expect(workspace.getInvitationEditorSectionForField('form')).toBeNull();
  });

  it('distinguishes off, incomplete, and complete Gallery states', () => {
    const draft = createDraft();
    let statuses = workspace.getInvitationEditorSectionStatuses(draft);

    expect(statuses.gallery).toBe('optional_off');

    draft.content.gallery.enabled = true;
    statuses = workspace.getInvitationEditorSectionStatuses(draft);
    expect(statuses.gallery).toBe('incomplete');

    draft.content.gallery.imageIds = ['33333333-3333-4333-8333-333333333333'];
    statuses = workspace.getInvitationEditorSectionStatuses(draft);
    expect(statuses.gallery).toBe('complete');
  });

  it('lets errors override completion in progress', () => {
    const draft = createDraft();
    const errors = {
      'eventSchedule.events.0.date': 'Tanggal tidak valid.',
    };
    const statuses = workspace.getInvitationEditorSectionStatuses(draft, errors);
    const progress = workspace.getInvitationEditorProgress(statuses);
    const Navigation = workspace.InvitationWorkspaceNavigation;
    const html = renderToStaticMarkup(
      <Navigation activeSection="style" onSelect={vi.fn()} statuses={statuses} />,
    );

    expect(statuses.schedule).toBe('error');
    expect(progress).toEqual({ error: 1, ready: 7, total: 9 });
    expect(html).toContain('7 siap · 1 perlu diperbaiki');
    expect(html).toContain('Status draf saat ini');
  });
});
