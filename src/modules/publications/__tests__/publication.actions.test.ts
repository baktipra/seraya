import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultInvitationDraftContent } from '@/modules/invitations/invitation-draft.defaults';

const { publishMock, revalidatePathMock, revalidateTagMock } = vi.hoisted(() => ({
  publishMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  revalidateTagMock: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: revalidatePathMock,
  revalidateTag: revalidateTagMock,
}));

vi.mock('../publication.service', () => ({
  publishInvitationForCurrentUser: publishMock,
}));

import { publishInvitationAction } from '../publication.actions';
import {
  PublicationAccessDeniedError,
  PublicationPaymentRequiredError,
} from '../publication.repository';
import { initialPublishInvitationActionState } from '../publication.action-state';

const projectId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const firstAssetId = '11111111-1111-4111-8111-111111111111';
const secondAssetId = '22222222-2222-4222-8222-222222222222';

function createPublishedSnapshot(imageIds: string[]) {
  const draft = createDefaultInvitationDraftContent({
    default_timezone: 'Asia/Jakarta',
    event_date_primary: '2027-08-17',
    person_one_name: 'Raka',
    person_two_name: 'Nadia',
  });
  draft.gallery = { enabled: imageIds.length > 0, imageIds };

  return {
    created_at: '2026-06-20T00:00:00.000Z',
    draft_schema_version: 1,
    id: '33333333-3333-4333-8333-333333333333',
    is_current: true,
    project_id: projectId,
    published_at: '2026-06-20T00:00:00.000Z',
    revision: 2,
    slug: 'raka-nadia',
    snapshot: {
      draft,
      project: {
        eventCity: 'Jakarta',
        eventDatePrimary: '2027-08-17',
        slug: 'raka-nadia',
        timezone: 'Asia/Jakarta',
      },
    },
    template_id: 'roselle' as const,
  };
}

describe('publish invitation action', () => {
  beforeEach(() => {
    publishMock.mockReset();
    revalidatePathMock.mockReset();
    revalidateTagMock.mockReset();
  });

  it('invalidates invitation and union gallery media cache tags after a successful publish', async () => {
    publishMock.mockResolvedValue({
      previousGalleryImageIds: [firstAssetId],
      snapshot: createPublishedSnapshot([secondAssetId]),
    });

    await expect(
      publishInvitationAction(projectId, initialPublishInvitationActionState, new FormData()),
    ).resolves.toEqual({ publishedSlug: 'raka-nadia', status: 'success' });

    expect(revalidateTagMock).toHaveBeenCalledWith('published-invitation:raka-nadia', 'max');
    expect(revalidatePathMock).toHaveBeenCalledWith('/raka-nadia');
    expect(revalidatePathMock).toHaveBeenCalledWith(`/dashboard/${projectId}`);
    expect(revalidateTagMock).toHaveBeenCalledWith(`published-media:${firstAssetId}`, 'max');
    expect(revalidateTagMock).toHaveBeenCalledWith(`published-media:${secondAssetId}`, 'max');
    expect(revalidatePathMock).toHaveBeenCalledWith(`/media/${firstAssetId}`);
    expect(revalidatePathMock).toHaveBeenCalledWith(`/media/${secondAssetId}`);
  });

  it('returns a human-safe error instead of database details', async () => {
    publishMock.mockRejectedValue(new Error('private database error detail'));

    await expect(
      publishInvitationAction(projectId, initialPublishInvitationActionState, new FormData()),
    ).resolves.toEqual({
      message: 'Undangan belum bisa dipublikasikan. Coba lagi beberapa saat lagi.',
      status: 'error',
    });
  });
  it('blocks a bypassed UI publish attempt when payment is not verified', async () => {
    publishMock.mockRejectedValue(new PublicationPaymentRequiredError());

    await expect(
      publishInvitationAction(projectId, initialPublishInvitationActionState, new FormData()),
    ).resolves.toEqual({
      message: 'Pembayaran terverifikasi diperlukan sebelum undangan dapat dipublikasikan.',
      status: 'error',
    });
  });

  it('keeps a foreign-owner publish attempt on the existing safe publication denial path', async () => {
    publishMock.mockRejectedValue(new PublicationAccessDeniedError());

    await expect(
      publishInvitationAction(projectId, initialPublishInvitationActionState, new FormData()),
    ).resolves.toEqual({
      message: 'Undangan ini tidak dapat dipublikasikan dari akun kamu.',
      status: 'error',
    });
  });

  it('uses the same action to refresh the owner overview after a replacement snapshot', async () => {
    publishMock.mockResolvedValue({
      previousGalleryImageIds: [firstAssetId],
      snapshot: createPublishedSnapshot([secondAssetId]),
    });

    await expect(
      publishInvitationAction(projectId, initialPublishInvitationActionState, new FormData()),
    ).resolves.toEqual({ publishedSlug: 'raka-nadia', status: 'success' });

    expect(publishMock).toHaveBeenCalledWith(projectId);
    expect(revalidatePathMock).toHaveBeenCalledWith(`/dashboard/${projectId}`);
  });
});
