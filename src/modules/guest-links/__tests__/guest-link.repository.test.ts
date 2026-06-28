import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createAdminSupabaseClientMock,
  fromMock,
  inMock,
  isMock,
  limitMock,
  orderMock,
  rpcMock,
  selectMock,
} = vi.hoisted(() => ({
  createAdminSupabaseClientMock: vi.fn(),
  fromMock: vi.fn(),
  inMock: vi.fn(),
  isMock: vi.fn(),
  limitMock: vi.fn(),
  orderMock: vi.fn(),
  rpcMock: vi.fn(),
  selectMock: vi.fn(),
}));

vi.mock('@/server/supabase/admin', () => ({
  createAdminSupabaseClient: createAdminSupabaseClientMock,
}));

import {
  createPersonalGuestLinkIfNoneActiveForVerifiedGuest,
  createPersonalGuestLinkIfNoneActiveWithCiphertextForVerifiedGuest,
  GuestLinkActiveLinkExistsError,
  GuestLinkRepositoryError,
  listLatestGuestLinkStatesForVerifiedGuestIds,
} from '../guest-link.repository';

const firstGuestId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const secondGuestId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

describe('latest owner guest-link delivery projection', () => {
  beforeEach(() => {
    createAdminSupabaseClientMock.mockReset();
    fromMock.mockReset();
    selectMock.mockReset();
    inMock.mockReset();
    isMock.mockReset();
    orderMock.mockReset();
    limitMock.mockReset();
    rpcMock.mockReset();

    createAdminSupabaseClientMock.mockReturnValue({ from: fromMock, rpc: rpcMock });
    fromMock.mockReturnValue({ select: selectMock });
    selectMock.mockReturnValue({ in: inMock });
    inMock.mockReturnValue({ is: isMock });
    isMock.mockReturnValue({ order: orderMock });
    orderMock.mockReturnValue({ limit: limitMock });
  });

  it('uses one guest-scoped embedded latest-state query without capability material or history rows', async () => {
    limitMock.mockResolvedValue({
      data: [
        {
          guest_links: [
            { created_at: '2027-01-05T00:00:00.000Z', status: 'active', token_key_version: 1 },
          ],
          id: firstGuestId,
        },
        { guest_links: [], id: secondGuestId },
      ],
      error: null,
    });

    await expect(
      listLatestGuestLinkStatesForVerifiedGuestIds([firstGuestId, secondGuestId]),
    ).resolves.toEqual([
      {
        created_at: '2027-01-05T00:00:00.000Z',
        guest_id: firstGuestId,
        hasRecoverableCapability: true,
        status: 'active',
      },
    ]);

    expect(fromMock).toHaveBeenCalledTimes(1);
    expect(fromMock).toHaveBeenCalledWith('guests');
    expect(selectMock).toHaveBeenCalledWith(
      'id, guest_links(status, created_at, token_key_version)',
    );
    expect(inMock).toHaveBeenCalledWith('id', [firstGuestId, secondGuestId]);
    expect(isMock).toHaveBeenCalledWith('deleted_at', null);
    expect(orderMock).toHaveBeenCalledWith('created_at', {
      ascending: false,
      foreignTable: 'guest_links',
    });
    expect(limitMock).toHaveBeenCalledWith(1, { foreignTable: 'guest_links' });
  });

  it('does not query when there are no active guests', async () => {
    await expect(listLatestGuestLinkStatesForVerifiedGuestIds([])).resolves.toEqual([]);
    expect(createAdminSupabaseClientMock).not.toHaveBeenCalled();
  });
});

describe('batch personal-link creation guard', () => {
  beforeEach(() => {
    createAdminSupabaseClientMock.mockReset();
    rpcMock.mockReset();
    createAdminSupabaseClientMock.mockReturnValue({ rpc: rpcMock });
  });

  it('calls the create-if-none-active authority with hash-only capability material', async () => {
    rpcMock.mockResolvedValue({ error: null });

    await expect(
      createPersonalGuestLinkIfNoneActiveForVerifiedGuest({
        guestId: firstGuestId,
        tokenHash: 'a'.repeat(64),
      }),
    ).resolves.toBeUndefined();

    expect(rpcMock).toHaveBeenCalledWith('create_personal_guest_link_if_none_active_for_server', {
      new_token_hash: 'a'.repeat(64),
      target_guest_id: firstGuestId,
    });
  });

  it('maps the stable active-link conflict to a safe batch skip signal', async () => {
    rpcMock.mockResolvedValue({ error: { code: 'P0001' } });

    await expect(
      createPersonalGuestLinkIfNoneActiveForVerifiedGuest({
        guestId: firstGuestId,
        tokenHash: 'b'.repeat(64),
      }),
    ).rejects.toBeInstanceOf(GuestLinkActiveLinkExistsError);
  });

  it('classifies the encrypted batch authority without retaining raw provider details', async () => {
    rpcMock.mockResolvedValue({ error: { code: 'P0002', message: 'private database detail' } });

    const failure = await createPersonalGuestLinkIfNoneActiveWithCiphertextForVerifiedGuest({
      guestId: firstGuestId,
      tokenCiphertext: 'v1.c2FsdGVkX2l2X2RhdGE.c2FsdGVkX3RhZw.c2FsdGVkX2NpcGhlcnRleHQ',
      tokenHash: 'c'.repeat(64),
      tokenKeyVersion: 1,
    }).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(GuestLinkRepositoryError);
    expect(failure).toMatchObject({ classification: 'active_guest_unavailable' });
    expect(JSON.stringify(failure)).not.toContain('private database detail');
  });

  it('sends only hash plus encrypted material to the M0019 atomic authority', async () => {
    rpcMock.mockResolvedValue({ error: null });

    await createPersonalGuestLinkIfNoneActiveWithCiphertextForVerifiedGuest({
      guestId: firstGuestId,
      tokenCiphertext: 'v1.c2FsdGVkX2l2X2RhdGE.c2FsdGVkX3RhZw.c2FsdGVkX2NpcGhlcnRleHQ',
      tokenHash: 'd'.repeat(64),
      tokenKeyVersion: 1,
    });

    expect(rpcMock).toHaveBeenCalledWith(
      'create_personal_guest_link_if_none_active_with_ciphertext_for_server',
      {
        new_token_ciphertext: 'v1.c2FsdGVkX2l2X2RhdGE.c2FsdGVkX3RhZw.c2FsdGVkX2NpcGhlcnRleHQ',
        new_token_hash: 'd'.repeat(64),
        new_token_key_version: 1,
        target_guest_id: firstGuestId,
      },
    );
  });
});
