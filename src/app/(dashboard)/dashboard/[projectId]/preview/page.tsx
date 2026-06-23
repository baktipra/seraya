import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Badge } from '@/design-system';
import {
  createInvitationViewModel,
  DEFAULT_PREVIEW_TEMPLATE_ID,
  getInvitationTemplate,
} from '@/modules/invitation-templates';
import {
  getOwnedProjectInvitationOverview,
  type OwnedProjectInvitationOverview,
} from '@/modules/invitations/invitation-draft.service';
import { getPrivateGalleryImagesForVerifiedProject } from '@/modules/media/media.service';
import type { InvitationGalleryImage } from '@/modules/media/media.types';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

type InvitationPreviewPageProps = {
  params: Promise<{ projectId: string }>;
};

export const dynamic = 'force-dynamic';

const PreviewInvitationTemplate = getInvitationTemplate(DEFAULT_PREVIEW_TEMPLATE_ID);

export default async function InvitationPreviewPage({ params }: InvitationPreviewPageProps) {
  const { projectId } = await params;
  let overview: OwnedProjectInvitationOverview;

  try {
    overview = await getOwnedProjectInvitationOverview(projectId);
  } catch (error) {
    if (error instanceof ProjectAccessDeniedError) {
      notFound();
    }

    throw error;
  }

  // An active project without an active draft is a safe recovery condition in
  // overview, but it must not expose a preview shell with partial metadata.
  if (!overview.draft) {
    notFound();
  }

  let galleryImages: InvitationGalleryImage[] = [];

  try {
    galleryImages = await getPrivateGalleryImagesForVerifiedProject({
      draftImageIds: overview.draft.content.gallery.imageIds,
      project: overview.project,
    });
  } catch (error) {
    // Gallery media is intentionally optional in the renderer. A missing,
    // failed, deleted, or unresolved asset omits cleanly instead of producing
    // a broken image placeholder or leaking storage details.
    console.error('Seraya private preview gallery resolution failed.', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
      projectId,
    });
  }

  const invitation = createInvitationViewModel({
    draft: overview.draft,
    galleryImages,
    project: overview.project,
  });
  return (
    <section aria-label="Pratinjau undangan" className="space-y-5 sm:space-y-7">
      <header className="border-seraya-border-default bg-seraya-surface flex flex-col gap-4 rounded-[var(--seraya-radius-lg)] border px-4 py-4 shadow-[var(--seraya-shadow-soft)] sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <Link
          className="text-seraya-action-primary focus-visible:outline-seraya-focus-ring w-fit rounded-[var(--seraya-radius-sm)] text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-3"
          href={`/dashboard/${projectId}`}
        >
          ← Kembali ke project
        </Link>
        <div className="flex flex-wrap items-center gap-2.5 sm:justify-end">
          <p className="text-seraya-text-primary text-sm font-semibold">Pratinjau undangan</p>
          <Badge variant={overview.project.status === 'published' ? 'success' : 'warning'}>
            {overview.project.status === 'published'
              ? 'Sudah dipublikasikan'
              : 'Belum dipublikasikan'}
          </Badge>
        </div>
      </header>

      <PreviewInvitationTemplate invitation={invitation} />
    </section>
  );
}
