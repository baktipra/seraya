import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getActiveDraftMock,
  getGuestsMock,
  getOwnedProjectMock,
  getPublicationMock,
  requireCurrentUserMock,
} = vi.hoisted(() => ({
  getActiveDraftMock: vi.fn(),
  getGuestsMock: vi.fn(),
  getOwnedProjectMock: vi.fn(),
  getPublicationMock: vi.fn(),
  requireCurrentUserMock: vi.fn(),
}));

vi.mock('@/modules/auth/current-user', () => ({
  requireCurrentUser: requireCurrentUserMock,
}));

vi.mock('@/modules/projects/project.repository', () => ({
  getOwnedProjectById: getOwnedProjectMock,
}));

vi.mock('@/modules/invitations/invitation-draft.repository', () => ({
  getActiveInvitationDraftForVerifiedProject: getActiveDraftMock,
}));

vi.mock('@/modules/guests/guest.repository', () => ({
  listActiveGuestsForVerifiedProject: getGuestsMock,
}));

vi.mock('@/modules/publications/publication.service', () => ({
  getCurrentPublishedInvitationForVerifiedProject: getPublicationMock,
}));

import {
  getOwnedProjectInvitationOverview,
  getOwnedProjectPrivateInvitationDraftForVerifiedProject,
} from '../invitation-draft.service';

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

const draft = { id: 'draft-id', project_id: project.id };

describe('SRY-006 private project invitation draft service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireCurrentUserMock.mockResolvedValue({
      email: 'owner@example.test',
      id: project.account_id,
      user_metadata: {},
    });
    getOwnedProjectMock.mockResolvedValue(project);
    getActiveDraftMock.mockResolvedValue(draft);
    getGuestsMock.mockResolvedValue([{ id: 'guest-1' }, { id: 'guest-2' }]);
    getPublicationMock.mockResolvedValue(null);
  });

  it('verifies project ownership before loading the active draft for the standalone overview', async () => {
    await expect(getOwnedProjectInvitationOverview(project.id)).resolves.toEqual({
      draft,
      guestCount: 2,
      publication: null,
      project,
    });
    expect(getOwnedProjectMock).toHaveBeenCalledWith(project.id, project.account_id);
    expect(getActiveDraftMock).toHaveBeenCalledWith(project);
    expect(getPublicationMock).toHaveBeenCalledWith(project);
    expect(getGuestsMock).toHaveBeenCalledWith(project);
  });

  it('loads only the active private draft for preview/gallery after project scope is already verified', async () => {
    await expect(getOwnedProjectPrivateInvitationDraftForVerifiedProject(project)).resolves.toEqual(
      {
        draft,
        project,
      },
    );

    expect(getActiveDraftMock).toHaveBeenCalledTimes(1);
    expect(getActiveDraftMock).toHaveBeenCalledWith(project);
    expect(getPublicationMock).not.toHaveBeenCalled();
    expect(getGuestsMock).not.toHaveBeenCalled();
    expect(requireCurrentUserMock).not.toHaveBeenCalled();
    expect(getOwnedProjectMock).not.toHaveBeenCalled();
  });
});
