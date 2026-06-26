import { describe, expect, it } from 'vitest';

import { createDefaultInvitationDraftContent } from '@/modules/invitations/invitation-draft.defaults';
import { invitationDraftContentSchema } from '@/modules/invitations/invitation-draft.schema';
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

  it('preserves a normalized legacy draft’s old event/location presentation until a modern schedule is saved', () => {
    const draft = createDraft();
    const legacyContent = structuredClone(draft.content) as Record<string, unknown>;
    delete legacyContent.eventSchedule;
    legacyContent.events = {
      ceremony: {
        date: '2027-08-17',
        enabled: true,
        endTime: '10:00',
        startTime: '08:00',
        title: 'Akad Nikah',
      },
      enabled: true,
      primaryDate: '2027-08-17',
      reception: {
        date: null,
        enabled: false,
        endTime: null,
        startTime: null,
        title: null,
      },
    };
    legacyContent.location = {
      address: 'Jalan Mawar 1',
      enabled: true,
      mapsUrl: 'https://maps.example.test/akad',
      venueName: 'Masjid Seraya',
    };

    // This is the same draft-schema boundary used by repositories before a renderer receives content.
    draft.content = invitationDraftContentSchema.parse(legacyContent);

    const invitation = createInvitationViewModel({ draft, project });

    expect(invitation.events).toEqual({
      items: [
        expect.objectContaining({
          dateLabel: '17 Agustus 2027',
          timeLabel: '08.00–10.00',
          title: 'Akad Nikah',
        }),
      ],
      primaryDateLabel: '17 Agustus 2027',
    });
    expect(invitation.location).toEqual({
      address: 'Jalan Mawar 1',
      mapsHref: 'https://maps.example.test/akad',
      venueName: 'Masjid Seraya',
    });
  });

  it('maps the owner-defined schedule in saved order, hides empty venue fields, and drops unsafe map links', () => {
    const draft = createDraft();
    const first = draft.content.eventSchedule.events[0]!;
    draft.content.eventSchedule.events = [
      {
        ...first,
        mapsUrl: 'https://maps.example.test/akad',
        title: 'Akad Nikah',
        venueAddress: 'Jalan Mawar 1',
        venueName: 'Masjid Seraya',
      },
      {
        ...first,
        date: '2027-08-18',
        endTime: null,
        id: '11111111-1111-4111-8111-111111111111',
        mapsUrl: null,
        startTime: '19:00',
        title: 'Resepsi',
        venueAddress: null,
        venueName: null,
      },
    ];

    const invitation = createInvitationViewModel({ draft, project });

    expect(invitation.events).toEqual({
      items: [
        expect.objectContaining({
          address: 'Jalan Mawar 1',
          mapsHref: 'https://maps.example.test/akad',
          title: 'Akad Nikah',
          venueName: 'Masjid Seraya',
        }),
        expect.objectContaining({
          address: null,
          mapsHref: null,
          title: 'Resepsi',
          venueName: null,
        }),
      ],
      primaryDateLabel: '17 Agustus 2027',
    });
    expect(invitation.location).toBeNull();
  });
});
