import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GuestAccessDeniedError } from '@/modules/guests/guest.policy';

const {
  ActiveLinkExistsErrorMock,
  createPersonalLinkMock,
  EncryptionErrorMock,
  getGuestMock,
  getLatestStateMock,
  getOwnedProjectMock,
  hasPublishedMock,
  listDeliveryGuestsMock,
  listLatestStatesMock,
  listSelectionEligibilityMock,
  prepareWithoutRevealMock,
  RepositoryErrorMock,
  requireCurrentUserMock,
} = vi.hoisted(() => ({
  ActiveLinkExistsErrorMock: class GuestLinkActiveLinkExistsError extends Error {},
  createPersonalLinkMock: vi.fn(),
  EncryptionErrorMock: class PersonalGuestLinkEncryptionError extends Error {
    constructor() {
      super('encryption');
      this.name = 'PersonalGuestLinkEncryptionError';
    }
  },
  getGuestMock: vi.fn(),
  getLatestStateMock: vi.fn(),
  getOwnedProjectMock: vi.fn(),
  hasPublishedMock: vi.fn(),
  listDeliveryGuestsMock: vi.fn(),
  listLatestStatesMock: vi.fn(),
  listSelectionEligibilityMock: vi.fn(),
  prepareWithoutRevealMock: vi.fn(),
  RepositoryErrorMock: class GuestLinkRepositoryError extends Error {
    classification: 'active_guest_unavailable' | 'authority_unavailable' | 'repository_failure';

    constructor(
      classification:
        | 'active_guest_unavailable'
        | 'authority_unavailable'
        | 'repository_failure' = 'repository_failure',
    ) {
      super('repository');
      this.classification = classification;
    }
  },
  requireCurrentUserMock: vi.fn(),
}));

vi.mock('@/modules/auth/current-user', () => ({ requireCurrentUser: requireCurrentUserMock }));
vi.mock('@/modules/guest-links/guest-link.repository', () => ({
  GuestLinkActiveLinkExistsError: ActiveLinkExistsErrorMock,
  GuestLinkRepositoryError: RepositoryErrorMock,
  listLatestGuestLinkStatesForVerifiedGuestIds: listLatestStatesMock,
}));
vi.mock('@/modules/guest-links/guest-link.service', () => ({
  createOrReplacePersonalGuestLinkForVerifiedGuest: createPersonalLinkMock,
  getLatestPersonalGuestLinkStateForVerifiedGuest: getLatestStateMock,
  GuestLinkLegacyUpgradeRequiredError: class GuestLinkLegacyUpgradeRequiredError extends Error {},
  GuestLinkUnavailableError: class GuestLinkUnavailableError extends Error {},
  preparePersonalGuestLinkForVerifiedGuestWithoutReveal: prepareWithoutRevealMock,
  reaccessPersonalGuestLinkForCurrentUser: vi.fn(),
}));
vi.mock('@/modules/guest-links/guest-link-encryption', () => ({
  PersonalGuestLinkEncryptionError: EncryptionErrorMock,
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
  listDeliveryGuestSelectionEligibilityForVerifiedProject: listSelectionEligibilityMock,
}));

import {
  DeliveryActiveLinkConfirmationRequiredError,
  DeliveryPublicationRequiredError,
  getGuestDeliveryCenterForVerifiedProject,
  maskDeliveryWhatsAppPhone,
  prepareMissingPersonalGuestLinksForDeliveryForCurrentUser,
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
    deleted_at: null,
    display_name: 'Keluarga Budi',
    group_label: 'Keluarga',
    id: activeGuest.id,
    project_id: project.id,
    rsvp_status: 'pending' as const,
    whatsapp_phone_e164: '+6281234567890',
  },
  {
    deleted_at: null,
    display_name: 'Rani',
    group_label: null,
    id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    project_id: project.id,
    rsvp_status: 'pending' as const,
    whatsapp_phone_e164: null,
  },
  {
    deleted_at: null,
    display_name: 'Dimas',
    group_label: 'Teman',
    id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    project_id: project.id,
    rsvp_status: 'declined' as const,
    whatsapp_phone_e164: '+6289876543210',
  },
  {
    deleted_at: null,
    display_name: 'Ayu',
    group_label: null,
    id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    project_id: project.id,
    rsvp_status: 'attending' as const,
    whatsapp_phone_e164: null,
  },
];

const removedGuestId = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const otherProjectGuestId = '99999999-9999-4999-8999-999999999999';

function selected(...guestIds: string[]) {
  return { guestIds, projectId: project.id };
}

describe('SRY-038A private Delivery Center batch preparation service', () => {
  beforeEach(() => {
    createPersonalLinkMock.mockReset();
    getGuestMock.mockReset();
    getLatestStateMock.mockReset();
    getOwnedProjectMock.mockReset();
    hasPublishedMock.mockReset();
    listDeliveryGuestsMock.mockReset();
    listLatestStatesMock.mockReset();
    listSelectionEligibilityMock.mockReset();
    prepareWithoutRevealMock.mockReset();
    requireCurrentUserMock.mockReset();

    requireCurrentUserMock.mockResolvedValue({ id: project.account_id });
    getOwnedProjectMock.mockResolvedValue(project);
    getGuestMock.mockResolvedValue(activeGuest);
    hasPublishedMock.mockResolvedValue(true);
    getLatestStateMock.mockResolvedValue('not_created');
    listDeliveryGuestsMock.mockResolvedValue(deliveryGuests);
    listLatestStatesMock.mockResolvedValue([]);
    listSelectionEligibilityMock.mockResolvedValue([]);
    prepareWithoutRevealMock.mockResolvedValue(undefined);
  });

  it('maps active guests into a minimum delivery DTO with one bounded status batch and readiness counts', async () => {
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
    expect(listLatestStatesMock).toHaveBeenCalledWith(deliveryGuests.map((guest) => guest.id));
    expect(result.summary).toEqual({
      activeGuestCount: 4,
      activePersonalLinkCount: 1,
      guestsWithoutActivePersonalLinkCount: 3,
      whatsappAvailableCount: 2,
      whatsappMissingCount: 2,
    });

    for (const row of result.rows) {
      expect(row).not.toHaveProperty('personalUrl');
      expect(row).not.toHaveProperty('token');
      expect(row).not.toHaveProperty('token_hash');
      expect(row).not.toHaveProperty('token_ciphertext');
      expect(row).not.toHaveProperty('whatsapp_phone_e164');
    }
  });

  it('uses the exact one-row selection for one eligible guest', async () => {
    const result = await prepareMissingPersonalGuestLinksForDeliveryForCurrentUser(
      selected(deliveryGuests[1]!.id),
    );

    expect(listSelectionEligibilityMock).toHaveBeenCalledWith(project, [deliveryGuests[1]!.id]);
    expect(prepareWithoutRevealMock).toHaveBeenCalledTimes(1);
    expect(prepareWithoutRevealMock).toHaveBeenCalledWith({
      guest: expect.objectContaining({ id: deliveryGuests[1]!.id, project_id: project.id }),
      project,
    });
    expect(result).toEqual({
      createdCount: 1,
      failedCount: 0,
      failedEncryptionCount: 0,
      failedUnexpectedCount: 0,
      requestedGuestCount: 1,
      skippedActiveLinkCount: 0,
      skippedInactiveGuestCount: 0,
      skippedInvalidProjectCount: 0,
      whatsappMissingCreatedCount: 1,
    });
  });

  it('uses the exact visible multi-select IDs and does not expand a missing selection to every guest', async () => {
    const result = await prepareMissingPersonalGuestLinksForDeliveryForCurrentUser(
      selected(deliveryGuests[1]!.id, deliveryGuests[2]!.id),
    );

    expect(prepareWithoutRevealMock).toHaveBeenCalledTimes(2);
    expect(prepareWithoutRevealMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ guest: expect.objectContaining({ id: activeGuest.id }) }),
    );
    expect(result.requestedGuestCount).toBe(2);
    expect(result.createdCount).toBe(2);
    expect(result.whatsappMissingCreatedCount).toBe(1);
  });

  it('returns already-active, inactive, and invalid-project counts without targeting those rows', async () => {
    listLatestStatesMock.mockResolvedValue([
      { created_at: '2027-01-03T00:00:00.000Z', guest_id: activeGuest.id, status: 'active' },
    ]);
    listSelectionEligibilityMock.mockResolvedValue([
      { deleted_at: '2027-01-02T00:00:00.000Z', id: removedGuestId },
    ]);

    const result = await prepareMissingPersonalGuestLinksForDeliveryForCurrentUser(
      selected(activeGuest.id, removedGuestId, otherProjectGuestId),
    );

    expect(prepareWithoutRevealMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      createdCount: 0,
      failedCount: 0,
      failedEncryptionCount: 0,
      failedUnexpectedCount: 0,
      requestedGuestCount: 3,
      skippedActiveLinkCount: 1,
      skippedInactiveGuestCount: 1,
      skippedInvalidProjectCount: 1,
      whatsappMissingCreatedCount: 0,
    });
  });

  it('skips a concurrently active link instead of replacing it during batch preparation', async () => {
    prepareWithoutRevealMock.mockRejectedValueOnce(new ActiveLinkExistsErrorMock());

    const result = await prepareMissingPersonalGuestLinksForDeliveryForCurrentUser(
      selected(deliveryGuests[1]!.id),
    );

    expect(result).toMatchObject({
      createdCount: 0,
      failedCount: 0,
      skippedActiveLinkCount: 1,
    });
  });

  it('classifies encryption runtime failures safely without exposing a capability', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    prepareWithoutRevealMock.mockRejectedValueOnce(new EncryptionErrorMock());

    const result = await prepareMissingPersonalGuestLinksForDeliveryForCurrentUser(
      selected(deliveryGuests[1]!.id),
    );

    expect(result).toMatchObject({
      createdCount: 0,
      failedCount: 1,
      failedEncryptionCount: 1,
      failedUnexpectedCount: 0,
      requestedGuestCount: 1,
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Seraya delivery batch personal-link preparation item failed.',
      expect.objectContaining({
        errorClassification: 'encryption_runtime',
        errorName: 'PersonalGuestLinkEncryptionError',
      }),
    );
    expect(JSON.stringify(result)).not.toContain('token');
    expect(JSON.stringify(result)).not.toContain('ciphertext');
    consoleErrorSpy.mockRestore();
  });

  it('classifies a guest removed during the atomic create guard as a safe skip', async () => {
    prepareWithoutRevealMock.mockRejectedValueOnce(
      new RepositoryErrorMock('active_guest_unavailable'),
    );

    const result = await prepareMissingPersonalGuestLinksForDeliveryForCurrentUser(
      selected(deliveryGuests[1]!.id),
    );

    expect(result).toMatchObject({
      createdCount: 0,
      failedCount: 0,
      skippedInactiveGuestCount: 1,
    });
  });

  it('reports unexpected batch failures with safe aggregate observability', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    prepareWithoutRevealMock.mockRejectedValueOnce(new Error('race'));

    const result = await prepareMissingPersonalGuestLinksForDeliveryForCurrentUser(
      selected(deliveryGuests[1]!.id),
    );

    expect(result).toMatchObject({
      createdCount: 0,
      failedCount: 1,
      failedEncryptionCount: 0,
      failedUnexpectedCount: 1,
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Seraya delivery batch personal-link preparation item failed.',
      expect.objectContaining({ errorClassification: 'unexpected', errorName: 'Error' }),
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Seraya delivery batch personal-link preparation completed with failures.',
      expect.objectContaining({ failedCount: 1, requestedGuestCount: 1 }),
    );
    consoleErrorSpy.mockRestore();
  });

  it('requires a current published snapshot before batch preparation', async () => {
    hasPublishedMock.mockResolvedValue(false);

    await expect(
      prepareMissingPersonalGuestLinksForDeliveryForCurrentUser(selected(deliveryGuests[1]!.id)),
    ).rejects.toBeInstanceOf(DeliveryPublicationRequiredError);

    expect(prepareWithoutRevealMock).not.toHaveBeenCalled();
  });

  it('masks private numbers without returning the full canonical value', () => {
    expect(maskDeliveryWhatsAppPhone('+6281234567890')).toBe('+62••••7890');
    expect(maskDeliveryWhatsAppPhone('+14155552671')).toBe('+14••••2671');
  });

  it('requires a current published snapshot before preparing a personal link', async () => {
    hasPublishedMock.mockResolvedValue(false);

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

  it('keeps existing single-link creation on the same verified authority', async () => {
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
        guestId: otherProjectGuestId,
        projectId: project.id,
      }),
    ).rejects.toBeInstanceOf(GuestAccessDeniedError);

    expect(createPersonalLinkMock).not.toHaveBeenCalled();
  });
});
