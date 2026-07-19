import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  GuestAccessDeniedError,
  GuestFollowUpHandoffNotEligibleError,
  GuestFollowUpPublicationRequiredError,
  GuestFollowUpRsvpUnavailableError,
  GuestLinkLegacyUpgradeRequiredError,
  GuestLinkUnavailableError,
  ProjectAccessDeniedError,
  prepareHandoffMock,
  revalidatePathMock,
} = vi.hoisted(() => ({
  GuestAccessDeniedError: class GuestAccessDeniedError extends Error {},
  GuestFollowUpHandoffNotEligibleError: class GuestFollowUpHandoffNotEligibleError extends Error {},
  GuestFollowUpPublicationRequiredError: class GuestFollowUpPublicationRequiredError extends Error {},
  GuestFollowUpRsvpUnavailableError: class GuestFollowUpRsvpUnavailableError extends Error {},
  GuestLinkLegacyUpgradeRequiredError: class GuestLinkLegacyUpgradeRequiredError extends Error {},
  GuestLinkUnavailableError: class GuestLinkUnavailableError extends Error {},
  ProjectAccessDeniedError: class ProjectAccessDeniedError extends Error {},
  prepareHandoffMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}));

vi.mock('next/cache', () => ({ revalidatePath: revalidatePathMock }));
vi.mock('@/modules/guest-links/guest-link.service', () => ({
  GuestLinkLegacyUpgradeRequiredError,
  GuestLinkUnavailableError,
  isGuestLinkFailure: () => false,
}));
vi.mock('@/modules/guests/guest.policy', () => ({ GuestAccessDeniedError }));
vi.mock('@/modules/projects/project.policy', () => ({ ProjectAccessDeniedError }));
vi.mock('../follow-up.service', () => ({
  GuestFollowUpHandoffNotEligibleError,
  GuestFollowUpPublicationRequiredError,
  GuestFollowUpRsvpUnavailableError,
  prepareGuestFollowUpHandoffForCurrentUser: prepareHandoffMock,
}));

import { prepareGuestFollowUpHandoffAction } from '../follow-up.actions';
import { initialGuestFollowUpHandoffActionState } from '../follow-up.action-state';

const boundInput = {
  guestId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  projectId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
};

function formData(messageKind = 'rsvp_reminder') {
  const data = new FormData();
  data.set('messageKind', messageKind);
  data.set('guestId', 'attacker-controlled');
  data.set('projectId', 'attacker-controlled');
  return data;
}

describe('Guest Follow-up Slice C handoff Server Action', () => {
  beforeEach(() => {
    prepareHandoffMock.mockReset();
    revalidatePathMock.mockReset();
  });

  it('uses only the server-bound target and returns truthful temporary handoff state', async () => {
    prepareHandoffMock.mockResolvedValue({
      messageKind: 'rsvp_reminder',
      messageText: 'Halo Budi',
      personalUrl: 'https://seraya.example/raka-nadia/g/token',
      preparedAt: '2027-08-15T03:00:00.000Z',
      whatsappComposeUrl: 'https://wa.me/6281234567890?text=Halo',
    });

    await expect(
      prepareGuestFollowUpHandoffAction(
        boundInput,
        initialGuestFollowUpHandoffActionState,
        formData(),
      ),
    ).resolves.toEqual({
      message: 'Handoff WhatsApp disiapkan. Buka WhatsApp untuk melanjutkan pengiriman manual.',
      messageKind: 'rsvp_reminder',
      messageText: 'Halo Budi',
      personalUrl: 'https://seraya.example/raka-nadia/g/token',
      preparedAt: '2027-08-15T03:00:00.000Z',
      status: 'success',
      whatsappComposeUrl: 'https://wa.me/6281234567890?text=Halo',
    });

    expect(prepareHandoffMock).toHaveBeenCalledWith({
      guestId: boundInput.guestId,
      messageKind: 'rsvp_reminder',
      projectId: boundInput.projectId,
    });
    expect(revalidatePathMock).toHaveBeenCalledWith(`/dashboard/${boundInput.projectId}`);
    expect(revalidatePathMock).toHaveBeenCalledWith(`/dashboard/${boundInput.projectId}/delivery`);
    expect(revalidatePathMock).toHaveBeenCalledWith(`/dashboard/${boundInput.projectId}/follow-up`);
  });

  it('rejects malformed bound targets and unsupported message kinds before authority', async () => {
    await expect(
      prepareGuestFollowUpHandoffAction(
        { ...boundInput, guestId: 'not-a-uuid' },
        initialGuestFollowUpHandoffActionState,
        formData(),
      ),
    ).resolves.toEqual({
      message: 'Handoff WhatsApp tidak dapat disiapkan untuk tamu ini.',
      status: 'error',
    });

    await expect(
      prepareGuestFollowUpHandoffAction(
        boundInput,
        initialGuestFollowUpHandoffActionState,
        formData('other'),
      ),
    ).resolves.toEqual({
      message: 'Handoff WhatsApp tidak dapat disiapkan untuk tamu ini.',
      status: 'error',
    });

    expect(prepareHandoffMock).not.toHaveBeenCalled();
  });

  it.each([
    [
      new GuestFollowUpPublicationRequiredError(),
      'Publikasikan undangan terlebih dahulu sebelum menyiapkan tindak lanjut.',
    ],
    [
      new GuestFollowUpRsvpUnavailableError(),
      'Konfirmasi kehadiran tidak aktif pada undangan yang dipublikasikan.',
    ],
    [
      new GuestFollowUpHandoffNotEligibleError(),
      'Tindak lanjut ini tidak tersedia untuk kondisi tamu saat ini.',
    ],
    [
      new GuestLinkLegacyUpgradeRequiredError(),
      'Tautan pribadi perlu diperbarui sebelum tindak lanjut dapat disiapkan.',
    ],
    [
      new GuestLinkUnavailableError(),
      'Tautan pribadi perlu diperbarui sebelum tindak lanjut dapat disiapkan.',
    ],
    [new ProjectAccessDeniedError(), 'Tindak lanjut tidak tersedia untuk tamu ini.'],
    [new GuestAccessDeniedError(), 'Tindak lanjut tidak tersedia untuk tamu ini.'],
  ])('maps a safe expected failure without returning handoff material', async (error, message) => {
    prepareHandoffMock.mockRejectedValue(error);

    const result = await prepareGuestFollowUpHandoffAction(
      boundInput,
      initialGuestFollowUpHandoffActionState,
      formData(),
    );

    expect(result).toEqual({ message, status: 'error' });
    expect(result).not.toHaveProperty('personalUrl');
    expect(result).not.toHaveProperty('messageText');
    expect(result).not.toHaveProperty('whatsappComposeUrl');
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
