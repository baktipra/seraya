import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createGuestForCurrentUserMock,
  revalidatePathMock,
  removeGuestForCurrentUserMock,
  updateGuestForCurrentUserMock,
} = vi.hoisted(() => ({
  createGuestForCurrentUserMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  removeGuestForCurrentUserMock: vi.fn(),
  updateGuestForCurrentUserMock: vi.fn(),
}));

vi.mock('next/cache', () => ({ revalidatePath: revalidatePathMock }));
vi.mock('../guest.service', () => ({
  createGuestForCurrentUser: createGuestForCurrentUserMock,
  isGuestRepositoryFailure: () => false,
  softRemoveGuestForCurrentUser: removeGuestForCurrentUserMock,
  updateGuestForCurrentUser: updateGuestForCurrentUserMock,
}));

import { initialGuestActionState } from '../guest.action-state';
import { createGuestAction, removeGuestAction, updateGuestAction } from '../guest.actions';

const projectId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const guestId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function guestFormData() {
  const formData = new FormData();
  formData.set('projectId', projectId);
  formData.set('guestId', guestId);
  formData.set('displayName', 'Keluarga Budi');
  formData.set('groupLabel', 'Keluarga');
  formData.set('partySize', '2');
  return formData;
}

describe('SRY-012 guest server actions', () => {
  beforeEach(() => {
    createGuestForCurrentUserMock.mockReset();
    removeGuestForCurrentUserMock.mockReset();
    updateGuestForCurrentUserMock.mockReset();
    revalidatePathMock.mockReset();
  });

  it('validates required guest data before any server mutation', async () => {
    const result = await createGuestAction(initialGuestActionState, new FormData());

    expect(result.status).toBe('error');
    expect(result.fieldErrors?.displayName).toBe('Nama tamu perlu diisi.');
    expect(createGuestForCurrentUserMock).not.toHaveBeenCalled();
  });

  it('creates a guest only through the server-owned project flow and refreshes factual counts', async () => {
    createGuestForCurrentUserMock.mockResolvedValue({
      display_name: 'Keluarga Budi',
      group_label: 'Keluarga',
      id: guestId,
      party_size: 2,
    });

    await expect(createGuestAction(initialGuestActionState, guestFormData())).resolves.toEqual({
      message: 'Tamu sudah ditambahkan.',
      status: 'success',
    });

    expect(createGuestForCurrentUserMock).toHaveBeenCalledWith({
      guest: { displayName: 'Keluarga Budi', groupLabel: 'Keluarga', partySize: 2 },
      projectId,
    });
    expect(revalidatePathMock).toHaveBeenCalledWith(`/dashboard/${projectId}`);
    expect(revalidatePathMock).toHaveBeenCalledWith(`/dashboard/${projectId}/guests`);
  });

  it('updates and soft-removes only the supplied verified project/guest scope', async () => {
    updateGuestForCurrentUserMock.mockResolvedValue({
      display_name: 'Keluarga Budi',
      group_label: null,
      id: guestId,
      party_size: 1,
    });
    removeGuestForCurrentUserMock.mockResolvedValue(undefined);

    const updateData = guestFormData();
    updateData.set('groupLabel', '   ');
    updateData.set('partySize', '1');

    await expect(updateGuestAction(initialGuestActionState, updateData)).resolves.toMatchObject({
      status: 'success',
    });
    await expect(
      removeGuestAction(initialGuestActionState, guestFormData()),
    ).resolves.toMatchObject({
      status: 'success',
    });

    expect(updateGuestForCurrentUserMock).toHaveBeenCalledWith({
      guest: { displayName: 'Keluarga Budi', groupLabel: null, partySize: 1 },
      guestId,
      projectId,
    });
    expect(removeGuestForCurrentUserMock).toHaveBeenCalledWith({ guestId, projectId });
  });
});
