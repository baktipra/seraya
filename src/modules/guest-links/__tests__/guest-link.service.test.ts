import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GuestAccessDeniedError } from '@/modules/guests/guest.policy';

const {
  createIfNoneActiveLinkMock,
  getGuestMock,
  getOwnedProjectMock,
  replaceLinkMock,
  requireCurrentUserMock,
  revokeLinkMock,
} = vi.hoisted(() => ({
  createIfNoneActiveLinkMock: vi.fn(),
  getGuestMock: vi.fn(),
  getOwnedProjectMock: vi.fn(),
  replaceLinkMock: vi.fn(),
  requireCurrentUserMock: vi.fn(),
  revokeLinkMock: vi.fn(),
}));

vi.mock('@/modules/auth/current-user', () => ({ requireCurrentUser: requireCurrentUserMock }));
vi.mock('@/modules/projects/project.repository', () => ({
  getOwnedProjectById: getOwnedProjectMock,
}));
vi.mock('@/modules/guests/guest.repository', () => ({
  getActiveGuestForVerifiedProjectWithAdmin: getGuestMock,
}));
vi.mock('../guest-link.repository', () => ({
  GuestLinkActiveLinkExistsError: class GuestLinkActiveLinkExistsError extends Error {},
  GuestLinkRepositoryError: class GuestLinkRepositoryError extends Error {},
  createPersonalGuestLinkIfNoneActiveForVerifiedGuest: createIfNoneActiveLinkMock,
  replacePersonalGuestLinkForVerifiedGuest: replaceLinkMock,
  revokePersonalGuestLinkForVerifiedGuest: revokeLinkMock,
}));

import {
  createOrReplacePersonalGuestLinkForCurrentUser,
  preparePersonalGuestLinkForVerifiedGuestWithoutReveal,
  revokePersonalGuestLinkForCurrentUser,
} from '../guest-link.service';

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

const guest = {
  created_at: '2026-06-21T00:00:00.000Z',
  deleted_at: null,
  display_name: 'Keluarga Budi',
  group_label: null,
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  party_size: 2,
  project_id: project.id,
  rsvp_status: 'pending' as const,
  updated_at: '2026-06-21T00:00:00.000Z',
  whatsapp_phone_e164: '+6281234567890',
};

describe('SRY-013 owner personal-link service ownership guard', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
    createIfNoneActiveLinkMock.mockReset();
    getGuestMock.mockReset();
    getOwnedProjectMock.mockReset();
    replaceLinkMock.mockReset();
    requireCurrentUserMock.mockReset();
    revokeLinkMock.mockReset();

    requireCurrentUserMock.mockResolvedValue({ id: project.account_id });
    getOwnedProjectMock.mockResolvedValue(project);
  });

  it('does not create or revoke a link for a guessed guest outside the verified project', async () => {
    getGuestMock.mockResolvedValue(null);

    await expect(
      createOrReplacePersonalGuestLinkForCurrentUser({
        guestId: guest.id,
        projectId: project.id,
      }),
    ).rejects.toBeInstanceOf(GuestAccessDeniedError);
    await expect(
      revokePersonalGuestLinkForCurrentUser({ guestId: guest.id, projectId: project.id }),
    ).rejects.toBeInstanceOf(GuestAccessDeniedError);

    expect(replaceLinkMock).not.toHaveBeenCalled();
    expect(revokeLinkMock).not.toHaveBeenCalled();
  });

  it('uses the create-only authority for batch preparation and never returns raw capability material', async () => {
    createIfNoneActiveLinkMock.mockResolvedValue(undefined);

    await expect(
      preparePersonalGuestLinkForVerifiedGuestWithoutReveal({ guest, project }),
    ).resolves.toBeUndefined();

    expect(createIfNoneActiveLinkMock).toHaveBeenCalledWith({
      guestId: guest.id,
      tokenHash: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
    expect(replaceLinkMock).not.toHaveBeenCalled();
  });

  it('hashes capability material before the repository mutation and returns a personal URL once', async () => {
    getGuestMock.mockResolvedValue(guest);
    replaceLinkMock.mockResolvedValue(undefined);

    const result = await createOrReplacePersonalGuestLinkForCurrentUser({
      guestId: guest.id,
      projectId: project.id,
    });

    expect(replaceLinkMock).toHaveBeenCalledWith(
      expect.objectContaining({
        guestId: guest.id,
        tokenHash: expect.stringMatching(/^[0-9a-f]{64}$/),
      }),
    );
    expect(result.personalUrl).toMatch(
      /^http:\/\/localhost:3000\/raka-nadia\/g\/[A-Za-z0-9_-]{43}$/,
    );
    expect(result.recipientWhatsAppPhoneE164).toBe('+6281234567890');
  });
});
