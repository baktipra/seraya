import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import {
  getInvitationEditorErrorSections,
  getInvitationEditorSectionForField,
  getInvitationEditorSectionStatuses,
  invitationEditorSections,
  InvitationWorkspaceNavigation,
  InvitationWorkspacePanel,
} from '@/components/projects/invitation-editor-workspace';
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

const draft = {
  content: createDefaultInvitationDraftContent(project),
  created_at: '2026-06-20T00:00:00.000Z',
  deleted_at: null,
  id: 'draft-private-id',
  project_id: project.id,
  schema_version: 1,
  updated_at: '2026-06-20T00:00:00.000Z',
};

describe('Slice A invitation editor workspace foundation', () => {
  it('exposes the locked nine-section owner journey in order', () => {
    expect(invitationEditorSections.map((section) => section.label)).toEqual([
      'Gaya undangan',
      'Pembuka',
      'Mempelai',
      'Cerita',
      'Rangkaian acara',
      'Galeri',
      'Konfirmasi tamu',
      'Amplop Digital',
      'Penutup',
    ]);
  });

  it('derives saved-draft completion and optional-off states without inventing gallery data', () => {
    expect(getInvitationEditorSectionStatuses(draft)).toMatchObject({
      closing: 'optional_off',
      couple: 'complete',
      gallery: 'optional_off',
      gift: 'optional_off',
      rsvp: 'incomplete',
      schedule: 'complete',
      story: 'optional_off',
      style: 'complete',
    });
  });

  it('maps server field errors to their section and promotes the saved status to error', () => {
    const errors = {
      'couple.personTwo.displayName': 'Nama pasangan wajib diisi.',
      'eventSchedule.events.0.date': 'Tanggal wajib diisi.',
    };

    expect(getInvitationEditorSectionForField('digitalGift.accounts.0.accountNumber')).toBe('gift');
    expect(getInvitationEditorSectionForField('gallery.imageIds')).toBeNull();
    expect(getInvitationEditorErrorSections(errors)).toEqual(['couple', 'schedule']);
    expect(getInvitationEditorSectionStatuses(draft, errors)).toMatchObject({
      couple: 'error',
      schedule: 'error',
    });
  });

  it('renders an accessible desktop rail, mobile selector, and keeps inactive panels mounted', () => {
    const statuses = getInvitationEditorSectionStatuses(draft);
    const navigation = renderToStaticMarkup(
      <InvitationWorkspaceNavigation
        activeSection="opening"
        onSelect={vi.fn()}
        statuses={statuses}
      />,
    );
    const inactivePanel = renderToStaticMarkup(
      <InvitationWorkspacePanel active={false} section="closing">
        <input name="closing.signature" />
      </InvitationWorkspacePanel>,
    );

    expect(navigation).toContain('aria-label="Bagian undangan"');
    expect(navigation).toContain('Bagian 2 dari 9');
    expect(navigation).toContain('aria-current="step"');
    expect(navigation).toContain('Status berasal dari draft terakhir tersimpan.');
    expect(inactivePanel).toContain('hidden=""');
    expect(inactivePanel).toContain('name="closing.signature"');
  });
});
