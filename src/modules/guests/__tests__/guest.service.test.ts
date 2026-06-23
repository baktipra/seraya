import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GuestAccessDeniedError } from '../guest.policy';

const {
  createGuestMock,
  getGuestMock,
  getOwnedProjectMock,
  listGuestLinkStatesMock,
  requireCurrentUserMock,
  softRemoveGuestMock,
  updateGuestMock,
} = vi.hoisted(() => ({
  createGuestMock: vi.fn(),
  getGuestMock: vi.fn(),
  getOwnedProjectMock: vi.fn(),
  listGuestLinkStatesMock: vi.fn(),
  requireCurrentUserMock: vi.fn(),
  softRemoveGuestMock: vi.fn(),
  updateGuestMock: vi.fn(),
}));

vi.mock('@/modules/auth/current-user', () => ({ requireCurrentUser: requireCurrentUserMock }));
vi.mock('@/modules/projects/project.repository', () => ({
  getOwnedProjectById: getOwnedProjectMock,
}));
vi.mock('@/modules/guest-links/guest-link.repository', () => ({
  listGuestLinkStatesForVerifiedGuestIds: listGuestLinkStatesMock,
}));
vi.mock('../guest.repository', () => ({
  createGuestForVerifiedProject: createGuestMock,
  getActiveGuestForVerifiedProjectWithAdmin: getGuestMock,
  GuestRepositoryError: class GuestRepositoryError extends Error {},
  listActiveGuestsForVerifiedProject: vi.fn(),
  softRemoveGuestForVerifiedProject: softRemoveGuestMock,
  updateGuestForVerifiedProject: updateGuestMock,
}));

import { softRemoveGuestForCurrentUser, updateGuestForCurrentUser } from '../guest.service';

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

const guestId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

describe('SRY-012 guest service ownership guard', () => {
  beforeEach(() => {
    createGuestMock.mockReset();
    getGuestMock.mockReset();
    getOwnedProjectMock.mockReset();
    listGuestLinkStatesMock.mockReset();
    requireCurrentUserMock.mockReset();
    softRemoveGuestMock.mockReset();
    updateGuestMock.mockReset();

    requireCurrentUserMock.mockResolvedValue({ id: project.account_id });
    getOwnedProjectMock.mockResolvedValue(project);
  });

  it('does not update or remove a guessed guest ID outside the verified project', async () => {
    getGuestMock.mockResolvedValue(null);

    await expect(
      updateGuestForCurrentUser({
        guest: { displayName: 'Tamu', groupLabel: null, partySize: 1 },
        guestId,
        projectId: project.id,
      }),
    ).rejects.toBeInstanceOf(GuestAccessDeniedError);
    await expect(
      softRemoveGuestForCurrentUser({ guestId, projectId: project.id }),
    ).rejects.toBeInstanceOf(GuestAccessDeniedError);

    expect(updateGuestMock).not.toHaveBeenCalled();
    expect(softRemoveGuestMock).not.toHaveBeenCalled();
  });
});
