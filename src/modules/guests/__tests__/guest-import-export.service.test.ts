import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

const { createGuestsMock, getOwnedProjectMock, listGuestsMock, requireCurrentUserMock } =
  vi.hoisted(() => ({
    createGuestsMock: vi.fn(),
    getOwnedProjectMock: vi.fn(),
    listGuestsMock: vi.fn(),
    requireCurrentUserMock: vi.fn(),
  }));

vi.mock('@/modules/auth/current-user', () => ({ requireCurrentUser: requireCurrentUserMock }));
vi.mock('@/modules/projects/project.repository', () => ({
  getOwnedProjectById: getOwnedProjectMock,
}));
vi.mock('../guest.repository', () => ({
  createGuestForVerifiedProject: vi.fn(),
  createGuestsForVerifiedProject: createGuestsMock,
  getActiveGuestForVerifiedProjectWithAdmin: vi.fn(),
  GuestRepositoryError: class GuestRepositoryError extends Error {},
  listActiveGuestsForVerifiedProject: listGuestsMock,
  softRemoveGuestForVerifiedProject: vi.fn(),
  updateGuestForVerifiedProject: vi.fn(),
}));
vi.mock('@/modules/guest-links/guest-link.repository', () => ({
  listGuestLinkStatesForVerifiedGuestIds: vi.fn(),
}));

import { getGuestDirectoryCsvForCurrentUser, importGuestCsvForCurrentUser } from '../guest.service';

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

function csvFile(source: string) {
  return new File([source], 'guests.csv', { type: 'text/csv' });
}

describe('SRY-014 guest import/export owner service', () => {
  beforeEach(() => {
    createGuestsMock.mockReset();
    getOwnedProjectMock.mockReset();
    listGuestsMock.mockReset();
    requireCurrentUserMock.mockReset();

    requireCurrentUserMock.mockResolvedValue({ id: project.account_id });
    getOwnedProjectMock.mockResolvedValue(project);
  });

  it('re-checks ownership, fully parses first, then inserts normalized guests in one batch only', async () => {
    createGuestsMock.mockResolvedValue(undefined);

    await expect(
      importGuestCsvForCurrentUser({
        file: csvFile('display_name,group_label,party_size\n Rani , Teman ,2\nBudi,,\n'),
        projectId: project.id,
      }),
    ).resolves.toBe(2);

    expect(requireCurrentUserMock).toHaveBeenCalledTimes(1);
    expect(getOwnedProjectMock).toHaveBeenCalledWith(project.id, project.account_id);
    expect(createGuestsMock).toHaveBeenCalledTimes(1);
    expect(createGuestsMock).toHaveBeenCalledWith({
      guests: [
        { displayName: 'Rani', groupLabel: 'Teman', partySize: 2 },
        { displayName: 'Budi', groupLabel: null, partySize: 1 },
      ],
      project,
    });

    const batch = createGuestsMock.mock.calls[0]?.[0]?.guests ?? [];
    expect(batch.every((guest: Record<string, unknown>) => !('rsvpStatus' in guest))).toBe(true);
    expect(batch.every((guest: Record<string, unknown>) => !('link' in guest))).toBe(true);
  });

  it('writes nothing when any CSV row fails validation', async () => {
    await expect(
      importGuestCsvForCurrentUser({
        file: csvFile('display_name,group_label,party_size\nRani,,1\n,Teman,2\n'),
        projectId: project.id,
      }),
    ).rejects.toThrow();

    expect(createGuestsMock).not.toHaveBeenCalled();
  });

  it('never imports into a guessed or soft-deleted owner scope', async () => {
    getOwnedProjectMock.mockRejectedValue(new ProjectAccessDeniedError());

    await expect(
      importGuestCsvForCurrentUser({
        file: csvFile('display_name,group_label,party_size\nRani,,1\n'),
        projectId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      }),
    ).rejects.toBeInstanceOf(ProjectAccessDeniedError);

    expect(createGuestsMock).not.toHaveBeenCalled();
    expect(listGuestsMock).not.toHaveBeenCalled();

    await expect(
      getGuestDirectoryCsvForCurrentUser('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
    ).rejects.toBeInstanceOf(ProjectAccessDeniedError);
  });

  it('exports only active guest directory values after the same ownership check', async () => {
    listGuestsMock.mockResolvedValue([
      {
        created_at: '2026-06-21T00:00:00.000Z',
        deleted_at: null,
        display_name: '=Formula',
        group_label: null,
        id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        party_size: 2,
        project_id: project.id,
        rsvp_status: 'declined',
        updated_at: '2026-06-21T00:00:00.000Z',
      },
    ]);

    await expect(getGuestDirectoryCsvForCurrentUser(project.id)).resolves.toBe(
      "\ufeffdisplay_name,group_label,party_size\r\n'=Formula,,2\r\n",
    );

    expect(listGuestsMock).toHaveBeenCalledWith(project);
  });
});
