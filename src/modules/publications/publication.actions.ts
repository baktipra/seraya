'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

import {
  PublicationAccessDeniedError,
  PublicationPaymentRequiredError,
  PublicationRepositoryError,
  PublicationValidationError,
} from './publication.repository';
import type { PublishInvitationActionState } from './publication.action-state';
import { publishInvitationForCurrentUser } from './publication.service';
import { getPublishedMediaCacheTag } from '@/modules/media/media.types';

import { getPublishedInvitationCacheTag } from './publication.types';

export async function publishInvitationAction(
  projectId: string,
  _previousState: PublishInvitationActionState,
  _formData: FormData,
): Promise<PublishInvitationActionState> {
  void _previousState;
  void _formData;

  try {
    const publication = await publishInvitationForCurrentUser(projectId);
    const { snapshot } = publication;
    const tag = getPublishedInvitationCacheTag(snapshot.slug);
    const mediaAssetIds = new Set([
      ...publication.previousGalleryImageIds,
      ...snapshot.snapshot.draft.gallery.imageIds,
    ]);

    // Server Action revalidation gives the owner a fresh link state immediately,
    // while the public route itself is still cacheable by its snapshot tag.
    revalidateTag(tag, 'max');
    revalidatePath(`/${snapshot.slug}`);
    revalidatePath(`/dashboard/${projectId}`);

    mediaAssetIds.forEach((assetId) => {
      revalidateTag(getPublishedMediaCacheTag(assetId), 'max');
      revalidatePath(`/media/${assetId}`);
    });

    return {
      publishedSlug: snapshot.slug,
      status: 'success',
    };
  } catch (error) {
    if (error instanceof PublicationAccessDeniedError) {
      return {
        message: 'Undangan ini tidak dapat dipublikasikan dari akun kamu.',
        status: 'error',
      };
    }

    if (error instanceof PublicationPaymentRequiredError) {
      return {
        message: 'Pembayaran terverifikasi diperlukan sebelum undangan dapat dipublikasikan.',
        status: 'error',
      };
    }

    if (error instanceof PublicationValidationError) {
      return {
        message: 'Undangan belum siap dipublikasikan. Periksa kembali detail dasar undangan.',
        status: 'error',
      };
    }

    if (error instanceof PublicationRepositoryError) {
      console.error('Seraya publication repository failure.', { errorName: error.name });
    } else {
      console.error('Seraya publication failed.', {
        errorName: error instanceof Error ? error.name : 'UnknownError',
      });
    }

    return {
      message: 'Undangan belum bisa dipublikasikan. Coba lagi beberapa saat lagi.',
      status: 'error',
    };
  }
}
