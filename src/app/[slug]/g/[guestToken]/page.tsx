import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { PersonalGuestGreeting } from '@/components/personal-invitation/personal-guest-greeting';
import { PersonalGuestRsvp } from '@/components/personal-invitation/personal-guest-rsvp';
import { PersonalGuestbook } from '@/components/personal-invitation/personal-guestbook';
import {
  createInvitationViewModel,
  InvitationTemplateRenderer,
} from '@/modules/invitation-templates';
import { getPublicGalleryImagesForCurrentSnapshot } from '@/modules/media/public-media.service';
import { getPersonalGuestInvitationByToken } from '@/modules/guest-links';
import { getPersonalGuestbookEntryByToken } from '@/modules/guestbook';
import { normalizePublishedInvitationSnapshot } from '@/modules/publications/published-invitation.schema';

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
  searchParams?: Promise<{
    guestbook?: string | string[] | undefined;
    rsvp?: string | string[] | undefined;
  }>;
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
  searchParams,
}: PersonalGuestInvitationPageProps) {
  const { guestToken, slug } = await params;
  const personalInvitation = await getPersonalGuestInvitationByToken({
    slug,
    token: guestToken,
  });

  const snapshot = personalInvitation
    ? normalizePublishedInvitationSnapshot(personalInvitation.snapshot)
    : null;

  if (!personalInvitation || !snapshot) {
    notFound();
  }

  const personalGuestbookEntry = await getPersonalGuestbookEntryByToken({
    slug,
    token: guestToken,
  });
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const guestbookFeedback =
    resolvedSearchParams?.guestbook === 'success'
      ? 'success'
      : resolvedSearchParams?.guestbook === 'error'
        ? 'error'
        : undefined;
  const rsvpFeedback = resolvedSearchParams?.rsvp === 'success' ? 'success' : undefined;

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
      <PersonalGuestGreeting displayName={personalInvitation.guestDisplayName} />
      <InvitationTemplateRenderer
        invitation={invitation}
        templateKey={snapshot.draft.templateKey}
      />
      {snapshot.draft.rsvp.enabled ? (
        <PersonalGuestRsvp
          guestToken={guestToken}
          feedback={rsvpFeedback}
          partySize={personalInvitation.partySize}
          rsvpAttendeeCount={personalInvitation.rsvpAttendeeCount}
          rsvpStatus={personalInvitation.rsvpStatus}
          slug={slug}
        />
      ) : null}
      <PersonalGuestbook
        entry={personalGuestbookEntry}
        feedback={guestbookFeedback}
        guestToken={guestToken}
        slug={slug}
      />
    </main>
  );
}
