import { describe, expect, it } from 'vitest';

import { createDefaultInvitationDraftContent } from '@/modules/invitations/invitation-draft.defaults';
import type { InvitationDraft } from '@/modules/invitations/invitation-draft.types';

import { createInvitationViewModel } from '../invitation-view-model';

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

function createDraft(): InvitationDraft {
  return {
    content: createDefaultInvitationDraftContent(project),
    created_at: '2026-06-20T00:00:00.000Z',
    deleted_at: null,
    id: 'draft-private-id',
    project_id: project.id,
    schema_version: 1,
    updated_at: '2026-06-20T00:00:00.000Z',
  };
}

describe('createInvitationViewModel', () => {
  it('maps the default draft to a complete, factual Roselle view model', () => {
    const invitation = createInvitationViewModel({ draft: createDraft(), project });

    expect(invitation.hero).toMatchObject({
      eyebrow: 'The Wedding Of',
      primaryDateLabel: '17 Agustus 2027',
      title: 'Raka & Nadia',
    });
    expect(invitation.couple.personOne.displayName).toBe('Raka');
    expect(invitation.couple.personTwo.displayName).toBe('Nadia');
    expect(invitation.events?.primaryDateLabel).toBe('17 Agustus 2027');
    expect(invitation.story).toBeNull();
    expect(invitation.location).toBeNull();
    expect(invitation.closing).toBeNull();
    expect(invitation.rsvp).toEqual({
      heading: 'Konfirmasi Kehadiran',
      lead: 'Konfirmasi kehadiran akan segera tersedia.',
    });
  });

  it('maps enabled Amplop Digital accounts in order and hides the section when disabled', () => {
    const draft = createDraft();
    draft.content.digitalGift = {
      accounts: [
        {
          accountHolder: 'Raka Pratama',
          accountNumber: '123456789012',
          id: '11111111-1111-4111-8111-111111111111',
          providerName: 'Bank Seraya',
        },
        {
          accountHolder: 'Nadia Pratama',
          accountNumber: '987654321098',
          id: '22222222-2222-4222-8222-222222222222',
          providerName: 'E-wallet Seraya',
        },
      ],
      enabled: true,
      heading: null,
      lead: 'Terima kasih atas doa terbaik Anda.',
    };

    const visible = createInvitationViewModel({ draft, project });
    expect(visible.digitalGift).toEqual({
      accounts: [
        {
          accountHolder: 'Raka Pratama',
          accountNumber: '123456789012',
          id: '11111111-1111-4111-8111-111111111111',
          providerName: 'Bank Seraya',
        },
        {
          accountHolder: 'Nadia Pratama',
          accountNumber: '987654321098',
          id: '22222222-2222-4222-8222-222222222222',
          providerName: 'E-wallet Seraya',
        },
      ],
      heading: 'Amplop Digital',
      lead: 'Terima kasih atas doa terbaik Anda.',
    });

    draft.content.digitalGift.enabled = false;
    expect(createInvitationViewModel({ draft, project }).digitalGift).toBeNull();
  });

  it('maps only render-safe resolved gallery items and never creates a gallery from unresolved IDs alone', () => {
    const draft = createDraft();
    const imageId = '11111111-1111-4111-8111-111111111111';
    draft.content.gallery = { enabled: true, imageIds: [imageId] };

    const unresolved = createInvitationViewModel({ draft, project });
    expect(unresolved.gallery).toBeNull();

    const resolved = createInvitationViewModel({
      draft,
      galleryImages: [{ alt: 'Foto pasangan 1', id: imageId, src: `/media/${imageId}` }],
      project,
    });
    expect(resolved.gallery).toEqual({
      images: [{ alt: 'Foto pasangan 1', id: imageId, src: `/media/${imageId}` }],
    });
  });

  it('renders partial but valid content without creating empty sections or unsafe maps links', () => {
    const draft = createDraft();
    draft.content.events.primaryDate = null;
    draft.content.events.enabled = true;
    draft.content.location.enabled = true;
    draft.content.location.mapsUrl = 'http://example.test/not-secure';

    const invitation = createInvitationViewModel({
      draft,
      project: { ...project, event_date_primary: null },
    });

    expect(invitation.events).toBeNull();
    expect(invitation.location).toBeNull();
  });
});
