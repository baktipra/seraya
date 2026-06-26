import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

const {
  getOwnedProjectMock,
  listEntriesMock,
  requireCurrentUserMock,
  resolvePersonalMock,
  softRemoveMock,
  submitPersonalMock,
} = vi.hoisted(() => ({
  getOwnedProjectMock: vi.fn(),
  listEntriesMock: vi.fn(),
  requireCurrentUserMock: vi.fn(),
  resolvePersonalMock: vi.fn(),
  softRemoveMock: vi.fn(),
  submitPersonalMock: vi.fn(),
}));

vi.mock('@/modules/auth/current-user', () => ({ requireCurrentUser: requireCurrentUserMock }));
vi.mock('@/modules/projects/project.repository', () => ({
  getOwnedProjectById: getOwnedProjectMock,
}));
vi.mock('../guestbook.repository', () => ({
  GuestbookRepositoryError: class GuestbookRepositoryError extends Error {},
  listGuestbookEntriesForVerifiedProject: listEntriesMock,
  mapPersonalGuestbookEntryRecord: (record: unknown) =>
    record &&
    typeof record === 'object' &&
    typeof (record as { message?: unknown }).message === 'string' &&
    typeof (record as { updated_at?: unknown }).updated_at === 'string'
      ? {
          message: (record as { message: string }).message,
          updatedAt: (record as { updated_at: string }).updated_at,
        }
      : null,
  resolvePersonalGuestbookEntryRecord: resolvePersonalMock,
  softRemoveGuestbookEntryForVerifiedProject: softRemoveMock,
  submitPersonalGuestbookEntryRecord: submitPersonalMock,
}));

import {
  getGuestbookInboxForCurrentUser,
  getPersonalGuestbookEntryByToken,
  softRemoveGuestbookEntryForCurrentUser,
  submitPersonalGuestbookEntry,
} from '../guestbook.service';

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

const token = 'A'.repeat(43);

describe('SRY-027 guestbook owner and personal capability services', () => {
  beforeEach(() => {
    getOwnedProjectMock.mockReset();
    listEntriesMock.mockReset();
    requireCurrentUserMock.mockReset();
    resolvePersonalMock.mockReset();
    softRemoveMock.mockReset();
    submitPersonalMock.mockReset();

    requireCurrentUserMock.mockResolvedValue({ id: project.account_id });
    getOwnedProjectMock.mockResolvedValue(project);
  });

  it('verifies owner project scope before loading or removing owner inbox entries', async () => {
    listEntriesMock.mockResolvedValue([]);

    await expect(getGuestbookInboxForCurrentUser(project.id)).resolves.toMatchObject({
      entries: [],
      project: { id: project.id },
    });
    await softRemoveGuestbookEntryForCurrentUser({
      entryId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      projectId: project.id,
    });

    expect(getOwnedProjectMock).toHaveBeenCalledWith(project.id, project.account_id);
    expect(listEntriesMock).toHaveBeenCalledWith(project);
    expect(softRemoveMock).toHaveBeenCalledWith({
      entryId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      project,
    });
  });

  it('does not query owner guestbook data for a foreign or unavailable project', async () => {
    getOwnedProjectMock.mockRejectedValue(new ProjectAccessDeniedError());

    await expect(
      getGuestbookInboxForCurrentUser('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
    ).rejects.toBeInstanceOf(ProjectAccessDeniedError);

    expect(listEntriesMock).not.toHaveBeenCalled();
  });

  it('passes only route capability and plain message into the personal submission boundary', async () => {
    submitPersonalMock.mockResolvedValue('created');
    resolvePersonalMock.mockResolvedValue({
      message: 'Semoga bahagia selalu',
      updated_at: '2027-08-17T09:00:00.000Z',
    });

    await expect(
      submitPersonalGuestbookEntry({ message: 'Semoga bahagia selalu', slug: 'raka-nadia', token }),
    ).resolves.toBe('created');
    await expect(getPersonalGuestbookEntryByToken({ slug: 'raka-nadia', token })).resolves.toEqual({
      message: 'Semoga bahagia selalu',
      updatedAt: '2027-08-17T09:00:00.000Z',
    });

    expect(submitPersonalMock).toHaveBeenCalledWith({
      message: 'Semoga bahagia selalu',
      slug: 'raka-nadia',
      token,
    });
    expect(resolvePersonalMock).toHaveBeenCalledWith({ slug: 'raka-nadia', token });
  });

  it('does not accept invalid route capability before calling a repository', async () => {
    await expect(
      submitPersonalGuestbookEntry({ message: 'Halo', slug: 'Raka Nadia', token: 'invalid' }),
    ).resolves.toBeNull();
    await expect(
      getPersonalGuestbookEntryByToken({ slug: 'Raka Nadia', token: 'invalid' }),
    ).resolves.toBeNull();

    expect(submitPersonalMock).not.toHaveBeenCalled();
    expect(resolvePersonalMock).not.toHaveBeenCalled();
  });
});
