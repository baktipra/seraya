import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  DeliveryActiveLinkConfirmationRequiredError,
  DeliveryPublicationRequiredError,
  GuestAccessDeniedError,
  ProjectAccessDeniedError,
  copyNumbersMock,
  prepareBatchMock,
  prepareLinkMock,
  reaccessLinkMock,
  revalidatePathMock,
} = vi.hoisted(() => ({
  DeliveryActiveLinkConfirmationRequiredError: class DeliveryActiveLinkConfirmationRequiredError extends Error {},
  DeliveryPublicationRequiredError: class DeliveryPublicationRequiredError extends Error {},
  GuestAccessDeniedError: class GuestAccessDeniedError extends Error {},
  ProjectAccessDeniedError: class ProjectAccessDeniedError extends Error {},
  copyNumbersMock: vi.fn(),
  prepareBatchMock: vi.fn(),
  prepareLinkMock: vi.fn(),
  reaccessLinkMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}));

vi.mock('next/cache', () => ({ revalidatePath: revalidatePathMock }));
vi.mock('../delivery.service', () => ({
  DeliveryActiveLinkConfirmationRequiredError,
  DeliveryPublicationRequiredError,
  GuestAccessDeniedError,
  isDeliveryFailure: () => false,
  getSelectedDeliveryWhatsAppNumbersForCurrentUser: copyNumbersMock,
  prepareMissingPersonalGuestLinksForDeliveryForCurrentUser: prepareBatchMock,
  preparePersonalGuestLinkForDeliveryForCurrentUser: prepareLinkMock,
  reaccessPersonalGuestLinkForDeliveryForCurrentUser: reaccessLinkMock,
}));
vi.mock('@/modules/projects/project.policy', () => ({ ProjectAccessDeniedError }));

import {
  copySelectedDeliveryWhatsAppNumbersAction,
  prepareMissingPersonalGuestLinksForDeliveryAction,
  preparePersonalGuestLinkForDeliveryAction,
  reaccessPersonalGuestLinkForDeliveryAction,
} from '../delivery.actions';
import {
  initialDeliveryBatchActionState,
  initialDeliveryLinkActionState,
  initialDeliveryWhatsAppClipboardActionState,
} from '../delivery.action-state';

const boundInput = {
  guestId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  projectId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
};

const batchBoundInput = { projectId: boundInput.projectId };

function createFormData(confirmActiveReplacement = 'false') {
  const formData = new FormData();
  formData.set('confirmActiveReplacement', confirmActiveReplacement);
  formData.set('projectId', 'attacker-controlled');
  formData.set('guestId', 'attacker-controlled');
  return formData;
}

function createBatchFormData(ids = [boundInput.guestId], confirmBatchPreparation = 'true') {
  const formData = new FormData();
  formData.set('confirmBatchPreparation', confirmBatchPreparation);
  formData.set('selectedGuestIds', JSON.stringify(ids));
  formData.set('projectId', 'attacker-controlled');
  return formData;
}

function createReaccessFormData(operation: 'copy' | 'open' | 'share') {
  const formData = new FormData();
  formData.set('operation', operation);
  formData.set('projectId', 'attacker-controlled');
  formData.set('guestId', 'attacker-controlled');
  return formData;
}

function createCopyNumbersFormData(ids = [boundInput.guestId]) {
  const formData = new FormData();
  formData.set('selectedGuestIds', JSON.stringify(ids));
  return formData;
}

describe('SRY-037 delivery link preparation Server Actions', () => {
  beforeEach(() => {
    copyNumbersMock.mockReset();
    prepareBatchMock.mockReset();
    prepareLinkMock.mockReset();
    reaccessLinkMock.mockReset();
    revalidatePathMock.mockReset();
  });

  it('uses only the server-bound project/guest target and returns the raw URL only in immediate per-guest success state', async () => {
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

  it('returns aggregate-only batch readiness and never exposes raw capability material', async () => {
    prepareBatchMock.mockResolvedValue({
      createdCount: 4,
      failedCount: 0,
      failedEncryptionCount: 0,
      failedUnexpectedCount: 0,
      requestedGuestCount: 1,
      skippedActiveLinkCount: 2,
      skippedInactiveGuestCount: 0,
      skippedInvalidProjectCount: 0,
      whatsappMissingCreatedCount: 1,
    });

    const result = await prepareMissingPersonalGuestLinksForDeliveryAction(
      batchBoundInput,
      initialDeliveryBatchActionState,
      createBatchFormData(),
    );

    expect(prepareBatchMock).toHaveBeenCalledWith({
      guestIds: [boundInput.guestId],
      projectId: batchBoundInput.projectId,
    });
    expect(result).toEqual({
      createdCount: 4,
      failedCount: 0,
      failedEncryptionCount: 0,
      failedUnexpectedCount: 0,
      requestedGuestCount: 1,
      skippedInactiveGuestCount: 0,
      skippedInvalidProjectCount: 0,
      message:
        'Undangan Pribadi sudah disiapkan. Lanjutkan pembagian manual per tamu di Delivery Center.',
      skippedActiveLinkCount: 2,
      status: 'success',
      whatsappMissingCreatedCount: 1,
    });
    expect(result).not.toHaveProperty('personalUrl');
    expect(result).not.toHaveProperty('token');
    expect(result).not.toHaveProperty('links');
    expect(revalidatePathMock).toHaveBeenCalledWith(`/dashboard/${boundInput.projectId}/delivery`);
  });

  it('reports partial batch counts without claiming all guests were prepared', async () => {
    prepareBatchMock.mockResolvedValue({
      createdCount: 3,
      failedCount: 1,
      failedEncryptionCount: 0,
      failedUnexpectedCount: 1,
      requestedGuestCount: 1,
      skippedActiveLinkCount: 2,
      skippedInactiveGuestCount: 0,
      skippedInvalidProjectCount: 0,
      whatsappMissingCreatedCount: 0,
    });

    await expect(
      prepareMissingPersonalGuestLinksForDeliveryAction(
        batchBoundInput,
        initialDeliveryBatchActionState,
        createBatchFormData(),
      ),
    ).resolves.toEqual({
      createdCount: 3,
      failedCount: 1,
      failedEncryptionCount: 0,
      failedUnexpectedCount: 1,
      requestedGuestCount: 1,
      skippedInactiveGuestCount: 0,
      skippedInvalidProjectCount: 0,
      message:
        'Sebagian Undangan Pribadi sudah diproses. Lihat ringkasan untuk tamu yang sudah aktif, dilewati, atau belum dapat disiapkan.',
      skippedActiveLinkCount: 2,
      status: 'partial',
      whatsappMissingCreatedCount: 0,
    });
  });

  it('requires an exact non-empty selectedGuestIds payload instead of falling back to all project guests', async () => {
    const formData = new FormData();
    formData.set('confirmBatchPreparation', 'true');

    await expect(
      prepareMissingPersonalGuestLinksForDeliveryAction(
        batchBoundInput,
        initialDeliveryBatchActionState,
        formData,
      ),
    ).resolves.toEqual({
      message: 'Undangan Pribadi belum dapat disiapkan. Konfirmasi kembali sebelum melanjutkan.',
      status: 'error',
    });

    expect(prepareBatchMock).not.toHaveBeenCalled();
  });

  it('rejects malformed batch bound targets before calling delivery authority', async () => {
    await expect(
      prepareMissingPersonalGuestLinksForDeliveryAction(
        { projectId: 'not-a-uuid' },
        initialDeliveryBatchActionState,
        createBatchFormData(),
      ),
    ).resolves.toEqual({
      message: 'Undangan Pribadi belum dapat disiapkan. Konfirmasi kembali sebelum melanjutkan.',
      status: 'error',
    });

    expect(prepareBatchMock).not.toHaveBeenCalled();
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

  it('rejects malformed bound targets before calling per-guest delivery authority', async () => {
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

  it('re-accesses an active recoverable URL only through the bound owner action and does not regenerate it', async () => {
    reaccessLinkMock.mockResolvedValue({
      personalUrl: 'https://seraya.example/raka-nadia/g/recoverable-token',
      recipientWhatsAppPhoneE164: '+6281234567890',
    });

    await expect(
      reaccessPersonalGuestLinkForDeliveryAction(
        boundInput,
        initialDeliveryLinkActionState,
        createReaccessFormData('copy'),
      ),
    ).resolves.toEqual({
      message: 'copy',
      personalUrl: 'https://seraya.example/raka-nadia/g/recoverable-token',
      recipientWhatsAppPhoneE164: '+6281234567890',
      status: 'success',
    });

    expect(reaccessLinkMock).toHaveBeenCalledWith(boundInput);
    expect(prepareLinkMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it('returns only valid selected WhatsApp numbers for local clipboard use and never opens or sends WhatsApp', async () => {
    copyNumbersMock.mockResolvedValue(['+6281234567890']);

    await expect(
      copySelectedDeliveryWhatsAppNumbersAction(
        batchBoundInput,
        initialDeliveryWhatsAppClipboardActionState,
        createCopyNumbersFormData(),
      ),
    ).resolves.toEqual({
      message: '1 Nomor WhatsApp siap disalin.',
      numbersText: '+6281234567890',
      status: 'success',
    });

    expect(copyNumbersMock).toHaveBeenCalledWith({
      guestIds: [boundInput.guestId],
      projectId: batchBoundInput.projectId,
    });
    expect(prepareBatchMock).not.toHaveBeenCalled();
  });
});
