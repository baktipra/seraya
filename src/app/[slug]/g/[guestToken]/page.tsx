import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { PersonalGuestGreeting } from '@/components/personal-invitation/personal-guest-greeting';
import { PersonalGuestRsvp } from '@/components/personal-invitation/personal-guest-rsvp';
import { PersonalGuestbook } from '@/components/personal-invitation/personal-guestbook';
import {
  createInvitationViewModel,
  InvitationTemplateRenderer,
} from '@/modules/invitation-templates';
import { getPersonalGuestInvitationByToken } from '@/modules/guest-links';
import { getPersonalGuestbookEntryByToken } from '@/modules/guestbook';
import { createInvitationAudioPlaybackCapability } from '@/modules/media/invitation-audio-playback.types';
import {
  getPublicGalleryImagesForCurrentSnapshot,
  getPublicPremiumMediaImagesForCurrentSnapshot,
} from '@/modules/media/public-media.service';

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

  const snapshot = personalInvitation?.snapshot ?? null;

  if (!personalInvitation || !snapshot) {
    notFound();
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const guestbookFeedback =
    resolvedSearchParams?.guestbook === 'success'
      ? 'success'
      : resolvedSearchParams?.guestbook === 'error'
        ? 'error'
        : undefined;
  const rsvpFeedback = resolvedSearchParams?.rsvp === 'success' ? 'success' : undefined;
  const [personalGuestbookEntry, galleryImages, premiumMediaImages] = await Promise.all([
    getPersonalGuestbookEntryByToken({ slug, token: guestToken }),
    getPublicGalleryImagesForCurrentSnapshot(snapshot.draft.gallery.imageIds),
    getPublicPremiumMediaImagesForCurrentSnapshot(snapshot.draft.premiumMedia),
  ]);
  const invitation = createInvitationViewModel({
    draft: { content: snapshot.draft },
    galleryImages,
    premiumMediaImages,
    project: {
      event_date_primary: snapshot.project.eventDatePrimary,
    },
  });

  return (
    <main className="bg-seraya-ivory min-h-screen px-0 py-0 sm:px-6 sm:py-8">
      <InvitationTemplateRenderer
        audioPlayback={createInvitationAudioPlaybackCapability({
          configuration: snapshot.draft.audio,
          requestUrl: `/api/invitations/${encodeURIComponent(slug)}/audio/playback`,
        })}
        invitation={invitation}
        paletteKey={snapshot.draft.paletteKey}
        personalSlots={{
          greeting: <PersonalGuestGreeting displayName={personalInvitation.guestDisplayName} />,
          guestbook: (
            <PersonalGuestbook
              entry={personalGuestbookEntry}
              feedback={guestbookFeedback}
              guestToken={guestToken}
              slug={slug}
            />
          ),
          rsvp: snapshot.draft.rsvp.enabled ? (
            <PersonalGuestRsvp
              guestToken={guestToken}
              feedback={rsvpFeedback}
              partySize={personalInvitation.partySize}
              rsvpAttendeeCount={personalInvitation.rsvpAttendeeCount}
              rsvpStatus={personalInvitation.rsvpStatus}
              slug={slug}
            />
          ) : undefined,
        }}
        surface="personal"
        templateKey={snapshot.draft.templateKey}
      />
    </main>
  );
}
