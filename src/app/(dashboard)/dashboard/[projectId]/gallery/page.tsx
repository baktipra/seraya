import { notFound } from 'next/navigation';

import { GalleryManager } from '@/components/projects/gallery-manager';
import { getOwnedProjectContextForRequest } from '@/modules/auth/dashboard-request-context';
import {
  getOwnedProjectPrivateInvitationDraftForVerifiedProject,
  type OwnedProjectPrivateInvitationDraft,
} from '@/modules/invitations/invitation-draft.service';
import { getPrivateGalleryImagesForVerifiedProject } from '@/modules/media/media.service';
import type { InvitationGalleryImage } from '@/modules/media/media.types';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

type GalleryPageProps = {
  params: Promise<{ projectId: string }>;
};

export const dynamic = 'force-dynamic';

export default async function GalleryPage({ params }: GalleryPageProps) {
  const { projectId } = await params;
  let privateDraft: OwnedProjectPrivateInvitationDraft;

  try {
    const project = await getOwnedProjectContextForRequest(projectId);
    privateDraft = await getOwnedProjectPrivateInvitationDraftForVerifiedProject(project);
  } catch (error) {
    if (error instanceof ProjectAccessDeniedError) {
      notFound();
    }

    throw error;
  }

  if (!privateDraft.draft) {
    notFound();
  }

  let images: InvitationGalleryImage[] = [];

  try {
    images = await getPrivateGalleryImagesForVerifiedProject({
      draftImageIds: privateDraft.draft.content.gallery.imageIds,
      project: privateDraft.project,
    });
  } catch (error) {
    // A stale or failed object must not break gallery management or leak any
    // Storage diagnostic. It remains absent until the owner uploads a valid image.
    console.error('Seraya gallery management image resolution failed.', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
      projectId,
    });
  }

  return (
    <GalleryManager
      initialImages={images}
      isPublished={privateDraft.project.status === 'published'}
      projectId={privateDraft.project.id}
    />
  );
}
