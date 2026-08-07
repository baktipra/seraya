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

function createLinkFormData() {
  const formData = new FormData();
  formData.set('projectId', projectId);
  formData.set('guestId', guestId);
  formData.set('accountId', 'attacker-controlled');
  formData.set('operation', 'create_or_replace');
  formData.set('expectedLifecycleState', 'not_created');
  formData.set('confirmActiveReplacement', 'false');
  return formData;
}

function revokeLinkFormData() {
  const formData = new FormData();
  formData.set('projectId', projectId);
  formData.set('guestId', guestId);
  formData.set('accountId', 'attacker-controlled');
  formData.set('operation', 'revoke');
  formData.set('expectedLifecycleState', 'active_recoverable');
  formData.set('confirmRevocation', 'true');
  return formData;
}

describe('SRY-013 personal guest-link server actions', () => {
  beforeEach(() => {
    createOrReplaceMock.mockReset();
    revalidatePathMock.mockReset();
    revokeMock.mockReset();
  });

  it('validates project, guest, operation, and lifecycle shape before a personal-link mutation', async () => {
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
      previousLifecycleState: 'not_created',
      recipientWhatsAppPhoneE164: '+6281234567890',
    });

    const result = await createOrReplacePersonalGuestLinkAction(
      initialGuestLinkActionState,
      createLinkFormData(),
    );

    expect(result).toEqual({
      message: 'Tautan pribadi berhasil dibuat.',
      personalUrl,
      recipientWhatsAppPhoneE164: '+6281234567890',
      resultKey: expect.any(String),
      status: 'success',
    });
    expect(createOrReplaceMock).toHaveBeenCalledWith({
      confirmActiveReplacement: false,
      expectedLifecycleState: 'not_created',
      guestId,
      projectId,
    });
    expect(revalidatePathMock).toHaveBeenCalledWith(`/dashboard/${projectId}`);
    expect(revalidatePathMock).toHaveBeenCalledWith(`/dashboard/${projectId}/delivery`);
    expect(revalidatePathMock).toHaveBeenCalledWith(`/dashboard/${projectId}/follow-up`);
    expect(revalidatePathMock).toHaveBeenCalledWith(`/dashboard/${projectId}/guests`);
  });

  it('revokes only through the verified project/guest lifecycle command', async () => {
    revokeMock.mockResolvedValue(undefined);

    await expect(
      revokePersonalGuestLinkAction(initialGuestLinkActionState, revokeLinkFormData()),
    ).resolves.toEqual({
      message: 'Tautan pribadi sudah dinonaktifkan.',
      status: 'success',
    });

    expect(revokeMock).toHaveBeenCalledWith({
      confirmRevocation: true,
      expectedLifecycleState: 'active_recoverable',
      guestId,
      projectId,
    });
  });
});
