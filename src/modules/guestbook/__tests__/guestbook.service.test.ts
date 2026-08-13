import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  getOwned: vi.fn(), listEntries: vi.fn(), listShared: vi.fn(), moderate: vi.fn(),
  requireUser: vi.fn(), resolve: vi.fn(), remove: vi.fn(), submit: vi.fn(),
}));
vi.mock('@/modules/auth/current-user', () => ({ requireCurrentUser: m.requireUser }));
vi.mock('@/modules/projects/project.repository', () => ({ getOwnedProjectById: m.getOwned }));
vi.mock('../guestbook.repository', () => ({
  GuestbookRepositoryError: class GuestbookRepositoryError extends Error {},
  listGuestbookEntriesForVerifiedProject: m.listEntries,
  listPersonalGuestbookSharedWishesRecords: m.listShared,
  mapPersonalGuestbookEntryRecord: (r: any) => r ? ({ message:r.message, shareWithGuests:r.share_with_guests===true, updatedAt:r.updated_at }) : null,
  mapPersonalGuestbookSharedWishRecord: (r: any) => r ? ({ createdAt:r.created_at, displayName:r.display_name, message:r.message }) : null,
  resolvePersonalGuestbookEntryRecord: m.resolve,
  setGuestbookEntryFeedHiddenForVerifiedProject: m.moderate,
  softRemoveGuestbookEntryForVerifiedProject: m.remove,
  submitPersonalGuestbookEntryRecord: m.submit,
}));

import { getPersonalGuestbookEntryByToken, getPersonalGuestbookSharedWishesByToken, setGuestbookEntryFeedHiddenForCurrentUser, submitPersonalGuestbookEntry } from '../guestbook.service';

const project = { account_id:'11111111-1111-1111-1111-111111111111', default_timezone:'Asia/Jakarta', id:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' };
const token = 'A'.repeat(43);

describe('guestbook v2 services', () => {
  beforeEach(() => {
    Object.values(m).forEach(x => x.mockReset());
    m.requireUser.mockResolvedValue({ id:project.account_id });
    m.getOwned.mockResolvedValue(project);
  });

  it('passes sharing consent and resolves it', async () => {
    m.submit.mockResolvedValue('created');
    m.resolve.mockResolvedValue({ message:'Semoga bahagia', share_with_guests:true, updated_at:'2027-08-17T09:00:00.000Z' });
    await expect(submitPersonalGuestbookEntry({ message:'Semoga bahagia', shareWithGuests:true, slug:'raka-nadia', token })).resolves.toBe('created');
    await expect(getPersonalGuestbookEntryByToken({ slug:'raka-nadia', token })).resolves.toMatchObject({ shareWithGuests:true });
  });

  it('maps shared feed and verifies moderation scope', async () => {
    m.listShared.mockResolvedValue([{ created_at:'2027-08-17T09:00:00.000Z', display_name:'Citra', message:'Doa terbaik.' }]);
    await expect(getPersonalGuestbookSharedWishesByToken({ slug:'raka-nadia', token })).resolves.toHaveLength(1);
    await setGuestbookEntryFeedHiddenForCurrentUser({ entryId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', hidden:true, projectId:project.id });
    expect(m.moderate).toHaveBeenCalledWith({ entryId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', hidden:true, project });
  });
});
