import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GuestAccessDeniedError } from '@/modules/guests/guest.policy';

const {
  createPersonalLinkMock,
  getGuestMock,
  getLatestStateMock,
  getOwnedProjectMock,
  hasPublishedMock,
  listDeliveryGuestsMock,
  listLatestStatesMock,
  requireCurrentUserMock,
} = vi.hoisted(() => ({
  createPersonalLinkMock: vi.fn(),
  getGuestMock: vi.fn(),
  getLatestStateMock: vi.fn(),
  getOwnedProjectMock: vi.fn(),
  hasPublishedMock: vi.fn(),
  listDeliveryGuestsMock: vi.fn(),
  listLatestStatesMock: vi.fn(),
  requireCurrentUserMock: vi.fn(),
}));

vi.mock('@/modules/auth/current-user', () => ({ requireCurrentUser: requireCurrentUserMock }));
vi.mock('@/modules/guest-links/guest-link.repository', () => ({
  listLatestGuestLinkStatesForVerifiedGuestIds: listLatestStatesMock,
}));
vi.mock('@/modules/guest-links/guest-link.service', () => ({
  createOrReplacePersonalGuestLinkForVerifiedGuest: createPersonalLinkMock,
  getLatestPersonalGuestLinkStateForVerifiedGuest: getLatestStateMock,
}));
vi.mock('@/modules/guests/guest.repository', () => ({
  getActiveGuestForVerifiedProjectWithAdmin: getGuestMock,
}));
vi.mock('@/modules/projects/project.repository', () => ({
  getOwnedProjectById: getOwnedProjectMock,
}));
vi.mock('@/modules/publications/publication.repository', () => ({
  hasCurrentPublishedInvitationForVerifiedProject: hasPublishedMock,
}));
vi.mock('../delivery.repository', () => ({
  DeliveryRepositoryError: class DeliveryRepositoryError extends Error {},
  listActiveDeliveryGuestsForVerifiedProject: listDeliveryGuestsMock,
}));

import {
  DeliveryActiveLinkConfirmationRequiredError,
  DeliveryPublicationRequiredError,
  getGuestDeliveryCenterForVerifiedProject,
  maskDeliveryWhatsAppPhone,
  preparePersonalGuestLinkForDeliveryForCurrentUser,
} from '../delivery.service';

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
  status: 'published',
};

const activeGuest = {
  created_at: '2027-01-01T00:00:00.000Z',
  deleted_at: null,
  display_name: 'Keluarga Budi',
  group_label: 'Keluarga',
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  party_size: 2,
  project_id: project.id,
  rsvp_attendee_count: null,
  rsvp_status: 'pending' as const,
  updated_at: '2027-01-01T00:00:00.000Z',
  whatsapp_phone_e164: '+6281234567890',
};

const deliveryGuests = [
  {
    display_name: 'Keluarga Budi',
    group_label: 'Keluarga',
    id: activeGuest.id,
    whatsapp_phone_e164: '+6281234567890',
  },
  {
    display_name: 'Rani',
    group_label: null,
    id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    whatsapp_phone_e164: null,
  },
  {
    display_name: 'Dimas',
    group_label: 'Teman',
    id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    whatsapp_phone_e164: '+6289876543210',
  },
  {
    display_name: 'Ayu',
    group_label: null,
    id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    whatsapp_phone_e164: null,
  },
];

describe('SRY-029 private Delivery Center service', () => {
  beforeEach(() => {
    createPersonalLinkMock.mockReset();
    getGuestMock.mockReset();
    getLatestStateMock.mockReset();
    getOwnedProjectMock.mockReset();
    hasPublishedMock.mockReset();
    listDeliveryGuestsMock.mockReset();
    listLatestStatesMock.mockReset();
    requireCurrentUserMock.mockReset();

    requireCurrentUserMock.mockResolvedValue({ id: project.account_id });
    getOwnedProjectMock.mockResolvedValue(project);
    getGuestMock.mockResolvedValue(activeGuest);
    hasPublishedMock.mockResolvedValue(true);
    getLatestStateMock.mockResolvedValue('not_created');
  });

  it('maps active guests into a minimum delivery DTO with one bounded status batch', async () => {
    listDeliveryGuestsMock.mockResolvedValue(deliveryGuests);
    listLatestStatesMock.mockResolvedValue([
      {
        created_at: '2027-01-03T00:00:00.000Z',
        guest_id: activeGuest.id,
        status: 'active',
      },
      {
        created_at: '2027-01-02T00:00:00.000Z',
        guest_id: activeGuest.id,
        status: 'revoked',
      },
      {
        created_at: '2027-01-04T00:00:00.000Z',
        guest_id: deliveryGuests[1]!.id,
        status: 'revoked',
      },
      {
        created_at: '2027-01-05T00:00:00.000Z',
        guest_id: deliveryGuests[2]!.id,
        status: 'expired',
      },
    ]);

    const result = await getGuestDeliveryCenterForVerifiedProject(project);

    expect(listDeliveryGuestsMock).toHaveBeenCalledWith(project);
    expect(hasPublishedMock).toHaveBeenCalledWith(project);
    expect(listLatestStatesMock).toHaveBeenCalledTimes(1);
    expect(listLatestStatesMock).toHaveBeenCalledWith(deliveryGuests.map((guest) => guest.id));
    expect(result.isPublished).toBe(true);
    expect(result.rows).toEqual([
      expect.objectContaining({
        displayName: 'Keluarga Budi',
        groupLabel: 'Keluarga',
        maskedWhatsAppNumber: '+62••••7890',
        personalLinkState: 'active',
        whatsappAvailability: 'available',
      }),
      expect.objectContaining({
        displayName: 'Rani',
        maskedWhatsAppNumber: null,
        personalLinkState: 'revoked',
        whatsappAvailability: 'missing',
      }),
      expect.objectContaining({
        displayName: 'Dimas',
        maskedWhatsAppNumber: '+62••••3210',
        personalLinkState: 'expired',
        whatsappAvailability: 'available',
      }),
      expect.objectContaining({
        displayName: 'Ayu',
        maskedWhatsAppNumber: null,
        personalLinkState: 'not_created',
        whatsappAvailability: 'missing',
      }),
    ]);
    expect(result.summary).toEqual({
      activeGuestCount: 4,
      activePersonalLinkCount: 1,
      whatsappAvailableCount: 2,
      whatsappMissingCount: 2,
    });

    for (const row of result.rows) {
      expect(row).not.toHaveProperty('personalUrl');
      expect(row).not.toHaveProperty('token');
      expect(row).not.toHaveProperty('token_hash');
      expect(row).not.toHaveProperty('whatsapp_phone_e164');
      expect(row).not.toHaveProperty('rsvp_attendee_count');
      expect(row).not.toHaveProperty('guestbook');
      expect(row).not.toHaveProperty('payment');
    }
  });

  it('masks private numbers without returning the full canonical value', () => {
    expect(maskDeliveryWhatsAppPhone('+6281234567890')).toBe('+62••••7890');
    expect(maskDeliveryWhatsAppPhone('+14155552671')).toBe('+14••••2671');
  });

  it('requires a current published snapshot before preparing a personal link', async () => {
    hasPublishedMock.mockResolvedValue(false);
    getLatestStateMock.mockResolvedValue('not_created');

    await expect(
      preparePersonalGuestLinkForDeliveryForCurrentUser({
        confirmActiveReplacement: false,
        guestId: activeGuest.id,
        projectId: project.id,
      }),
    ).rejects.toBeInstanceOf(DeliveryPublicationRequiredError);

    expect(getLatestStateMock).not.toHaveBeenCalled();
    expect(createPersonalLinkMock).not.toHaveBeenCalled();
  });

  it('requires explicit server-checked confirmation before replacing an active link', async () => {
    getLatestStateMock.mockResolvedValue('active');

    await expect(
      preparePersonalGuestLinkForDeliveryForCurrentUser({
        confirmActiveReplacement: false,
        guestId: activeGuest.id,
        projectId: project.id,
      }),
    ).rejects.toBeInstanceOf(DeliveryActiveLinkConfirmationRequiredError);

    expect(createPersonalLinkMock).not.toHaveBeenCalled();
  });

  it('uses the existing verified guest-link authority after owner, guest, publication, and confirmation checks', async () => {
    getLatestStateMock.mockResolvedValue('active');
    createPersonalLinkMock.mockResolvedValue({
      personalUrl: 'https://seraya.example/raka-nadia/g/opaque-token',
      recipientWhatsAppPhoneE164: '+6281234567890',
    });

    const result = await preparePersonalGuestLinkForDeliveryForCurrentUser({
      confirmActiveReplacement: true,
      guestId: activeGuest.id,
      projectId: project.id,
    });

    expect(getOwnedProjectMock).toHaveBeenCalledWith(project.id, project.account_id);
    expect(getGuestMock).toHaveBeenCalledWith(project, activeGuest.id);
    expect(createPersonalLinkMock).toHaveBeenCalledWith({ guest: activeGuest, project });
    expect(result).toEqual({
      personalUrl: 'https://seraya.example/raka-nadia/g/opaque-token',
      recipientWhatsAppPhoneE164: '+6281234567890',
    });
  });

  it('does not prepare a link for a guessed guest outside the verified project', async () => {
    getGuestMock.mockResolvedValue(null);

    await expect(
      preparePersonalGuestLinkForDeliveryForCurrentUser({
        confirmActiveReplacement: false,
        guestId: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
        projectId: project.id,
      }),
    ).rejects.toBeInstanceOf(GuestAccessDeniedError);

    expect(createPersonalLinkMock).not.toHaveBeenCalled();
  });
});
