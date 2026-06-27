import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import {
  createInvitationViewModel,
  InvitationTemplateRenderer,
} from '@/modules/invitation-templates';
import { getPublicGalleryImagesForCurrentSnapshot } from '@/modules/media/public-media.service';
import { getPublicInvitationBySlug } from '@/modules/publications/public-invitation.service';

export const revalidate = 3600;
export const dynamic = 'force-static';

const privateInvitationRobots: Metadata['robots'] = {
  follow: false,
  index: false,
  noarchive: true,
};

type PublicInvitationPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PublicInvitationPageProps): Promise<Metadata> {
  const { slug } = await params;
  const invitation = await getPublicInvitationBySlug(slug);

  const snapshot = invitation?.snapshot ?? null;

  if (!invitation || !invitation.is_current || !snapshot) {
    return { robots: privateInvitationRobots };
  }

  const title =
    snapshot.draft.hero.title ??
    `${snapshot.draft.couple.personOne.displayName} & ${snapshot.draft.couple.personTwo.displayName}`;

  return {
    robots: privateInvitationRobots,
    title,
  };
}

/**
 * Anonymous, snapshot-only selected-template runtime. Do not add session or dashboard
 * dependencies here: RLS and the public repository expose only current,
 * published, non-deleted snapshots by slug.
 */
export default async function PublicInvitationPage({ params }: PublicInvitationPageProps) {
  const { slug } = await params;
  const publishedInvitation = await getPublicInvitationBySlug(slug);

  const snapshot = publishedInvitation?.snapshot ?? null;

  if (!publishedInvitation || !publishedInvitation.is_current || !snapshot) {
    notFound();
  }

  const galleryImages = await getPublicGalleryImagesForCurrentSnapshot(
    snapshot.draft.gallery.imageIds,
  );
  const invitation = createInvitationViewModel({
    draft: { content: snapshot.draft },
    galleryImages,
    project: {
      event_date_primary: snapshot.project.eventDatePrimary,
    },
  });

  return (
    <main className="bg-seraya-ivory min-h-screen px-0 py-0 sm:px-6 sm:py-8">
      <InvitationTemplateRenderer
        invitation={invitation}
        surface="generic"
        templateKey={snapshot.draft.templateKey}
      />
    </main>
  );
}
