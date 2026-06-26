import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  DeliveryActiveLinkConfirmationRequiredError,
  DeliveryPublicationRequiredError,
  GuestAccessDeniedError,
  ProjectAccessDeniedError,
  prepareLinkMock,
  revalidatePathMock,
} = vi.hoisted(() => ({
  DeliveryActiveLinkConfirmationRequiredError: class DeliveryActiveLinkConfirmationRequiredError extends Error {},
  DeliveryPublicationRequiredError: class DeliveryPublicationRequiredError extends Error {},
  GuestAccessDeniedError: class GuestAccessDeniedError extends Error {},
  ProjectAccessDeniedError: class ProjectAccessDeniedError extends Error {},
  prepareLinkMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}));

vi.mock('next/cache', () => ({ revalidatePath: revalidatePathMock }));
vi.mock('../delivery.service', () => ({
  DeliveryActiveLinkConfirmationRequiredError,
  DeliveryPublicationRequiredError,
  GuestAccessDeniedError,
  isDeliveryFailure: () => false,
  preparePersonalGuestLinkForDeliveryForCurrentUser: prepareLinkMock,
}));
vi.mock('@/modules/projects/project.policy', () => ({ ProjectAccessDeniedError }));

import { preparePersonalGuestLinkForDeliveryAction } from '../delivery.actions';
import { initialDeliveryLinkActionState } from '../delivery.action-state';

const boundInput = {
  guestId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  projectId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
};

function createFormData(confirmActiveReplacement = 'false') {
  const formData = new FormData();
  formData.set('confirmActiveReplacement', confirmActiveReplacement);
  formData.set('projectId', 'attacker-controlled');
  formData.set('guestId', 'attacker-controlled');
  return formData;
}

describe('SRY-029 delivery link preparation Server Action', () => {
  beforeEach(() => {
    prepareLinkMock.mockReset();
    revalidatePathMock.mockReset();
  });

  it('uses only the server-bound project/guest target and returns the raw URL only in immediate success state', async () => {
    prepareLinkMock.mockResolvedValue({
      personalUrl: 'https://seraya.example/raka-nadia/g/opaque-token',
      recipientWhatsAppPhoneE164: '+6281234567890',
    });

    await expect(
      preparePersonalGuestLinkForDeliveryAction(
        boundInput,
        initialDeliveryLinkActionState,
        createFormData('true'),
      ),
    ).resolves.toEqual({
      message: 'Tautan pribadi siap untuk disalin.',
      personalUrl: 'https://seraya.example/raka-nadia/g/opaque-token',
      recipientWhatsAppPhoneE164: '+6281234567890',
      status: 'success',
    });

    expect(prepareLinkMock).toHaveBeenCalledWith({
      confirmActiveReplacement: true,
      guestId: boundInput.guestId,
      projectId: boundInput.projectId,
    });
    expect(revalidatePathMock).toHaveBeenCalledWith(`/dashboard/${boundInput.projectId}`);
    expect(revalidatePathMock).toHaveBeenCalledWith(`/dashboard/${boundInput.projectId}/delivery`);
    expect(revalidatePathMock).toHaveBeenCalledWith(`/dashboard/${boundInput.projectId}/guests`);
  });

  it('keeps an unpublished project from preparing or replacing a link', async () => {
    prepareLinkMock.mockRejectedValue(new DeliveryPublicationRequiredError());

    await expect(
      preparePersonalGuestLinkForDeliveryAction(
        boundInput,
        initialDeliveryLinkActionState,
        createFormData(),
      ),
    ).resolves.toEqual({
      message: 'Publikasikan undangan terlebih dahulu sebelum membagikan tautan pribadi.',
      status: 'error',
    });

    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it('reports an active-link confirmation requirement without exposing link state or secrets', async () => {
    prepareLinkMock.mockRejectedValue(new DeliveryActiveLinkConfirmationRequiredError());

    await expect(
      preparePersonalGuestLinkForDeliveryAction(
        boundInput,
        initialDeliveryLinkActionState,
        createFormData(),
      ),
    ).resolves.toEqual({
      message: 'Konfirmasikan penggantian tautan aktif sebelum membuat tautan baru.',
      status: 'error',
    });
  });

  it('rejects malformed bound targets before calling delivery authority', async () => {
    await expect(
      preparePersonalGuestLinkForDeliveryAction(
        { guestId: 'not-a-uuid', projectId: boundInput.projectId },
        initialDeliveryLinkActionState,
        createFormData(),
      ),
    ).resolves.toEqual({
      message: 'Tautan pribadi tidak dapat disiapkan untuk tamu ini.',
      status: 'error',
    });

    expect(prepareLinkMock).not.toHaveBeenCalled();
  });
});
