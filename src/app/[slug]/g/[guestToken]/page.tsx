import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { PersonalGuestGreeting } from '@/components/personal-invitation/personal-guest-greeting';
import { PersonalGuestRsvp } from '@/components/personal-invitation/personal-guest-rsvp';
import {
  createInvitationViewModel,
  InvitationTemplateRenderer,
} from '@/modules/invitation-templates';
import { getPublicGalleryImagesForCurrentSnapshot } from '@/modules/media/public-media.service';
import { getPersonalGuestInvitationByToken } from '@/modules/guest-links';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const personalInvitationRobots: Metadata['robots'] = {
  follow: false,
  index: false,
  noarchive: true,
};

type PersonalGuestInvitationPageProps = {
  params: Promise<{ guestToken: string; slug: string }>;
};

/** Metadata is deliberately token-free and does not perform a capability lookup. */
export function generateMetadata(): Metadata {
  return {
    robots: personalInvitationRobots,
    title: 'Undangan pribadi',
  };
}

/**
 * Anonymous, no-store personal invitation route. Snapshot content and guest
 * personalization are composed separately, so published snapshot schema stays
 * fully public-safe and guest-free.
 */
export default async function PersonalGuestInvitationPage({
  params,
}: PersonalGuestInvitationPageProps) {
  const { guestToken, slug } = await params;
  const personalInvitation = await getPersonalGuestInvitationByToken({
    slug,
    token: guestToken,
  });

  if (!personalInvitation) {
    notFound();
  }

  const galleryImages = await getPublicGalleryImagesForCurrentSnapshot(
    personalInvitation.snapshot.draft.gallery.imageIds,
  );
  const invitation = createInvitationViewModel({
    draft: { content: personalInvitation.snapshot.draft },
    galleryImages,
    project: {
      event_date_primary: personalInvitation.snapshot.project.eventDatePrimary,
    },
  });

  return (
    <main className="bg-seraya-ivory min-h-screen px-0 py-0 sm:px-6 sm:py-8">
      <PersonalGuestGreeting displayName={personalInvitation.guestDisplayName} />
      <InvitationTemplateRenderer
        invitation={invitation}
        templateKey={personalInvitation.snapshot.draft.templateKey}
      />
      {personalInvitation.snapshot.draft.rsvp.enabled ? (
        <PersonalGuestRsvp
          guestToken={guestToken}
          rsvpStatus={personalInvitation.rsvpStatus}
          slug={slug}
        />
      ) : null}
    </main>
  );
}
