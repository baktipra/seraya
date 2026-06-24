import { randomBytes } from 'node:crypto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createOrReplaceMock, revalidatePathMock, revokeMock } = vi.hoisted(() => ({
  createOrReplaceMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  revokeMock: vi.fn(),
}));

vi.mock('next/cache', () => ({ revalidatePath: revalidatePathMock }));
vi.mock('../guest-link.service', () => ({
  GuestAccessDeniedError: class GuestAccessDeniedError extends Error {},
  createOrReplacePersonalGuestLinkForCurrentUser: createOrReplaceMock,
  isGuestLinkFailure: () => false,
  revokePersonalGuestLinkForCurrentUser: revokeMock,
}));

import { initialGuestLinkActionState } from '../guest-link.action-state';
import {
  createOrReplacePersonalGuestLinkAction,
  revokePersonalGuestLinkAction,
} from '../guest-link.actions';

const projectId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const guestId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function linkFormData() {
  const formData = new FormData();
  formData.set('projectId', projectId);
  formData.set('guestId', guestId);
  formData.set('accountId', 'attacker-controlled');
  return formData;
}

describe('SRY-013 personal guest-link server actions', () => {
  beforeEach(() => {
    createOrReplaceMock.mockReset();
    revalidatePathMock.mockReset();
    revokeMock.mockReset();
  });

  it('validates project and guest shape before a personal-link mutation', async () => {
    const result = await createOrReplacePersonalGuestLinkAction(
      initialGuestLinkActionState,
      new FormData(),
    );

    expect(result.status).toBe('error');
    expect(createOrReplaceMock).not.toHaveBeenCalled();
  });

  it('returns the fresh personal URL only in the immediate successful action result', async () => {
    const token = randomBytes(32).toString('base64url');
    const personalUrl = new URL(`/raka-nadia/g/${token}`, 'https://seraya.example').toString();
    createOrReplaceMock.mockResolvedValue({
      personalUrl,
      recipientWhatsAppPhoneE164: '+6281234567890',
    });

    await expect(
      createOrReplacePersonalGuestLinkAction(initialGuestLinkActionState, linkFormData()),
    ).resolves.toEqual({
      message: 'Tautan pribadi siap untuk disalin.',
      personalUrl,
      recipientWhatsAppPhoneE164: '+6281234567890',
      status: 'success',
    });

    expect(createOrReplaceMock).toHaveBeenCalledWith({ guestId, projectId });
    expect(revalidatePathMock).toHaveBeenCalledWith(`/dashboard/${projectId}`);
    expect(revalidatePathMock).toHaveBeenCalledWith(`/dashboard/${projectId}/guests`);
  });

  it('revokes only through the verified project/guest server flow', async () => {
    revokeMock.mockResolvedValue(undefined);

    await expect(
      revokePersonalGuestLinkAction(initialGuestLinkActionState, linkFormData()),
    ).resolves.toEqual({
      message: 'Tautan pribadi sudah dinonaktifkan.',
      status: 'success',
    });

    expect(revokeMock).toHaveBeenCalledWith({ guestId, projectId });
  });
});
