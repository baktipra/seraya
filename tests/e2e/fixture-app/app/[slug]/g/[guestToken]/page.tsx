import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';

import { PersonalGuestGreeting } from '@/components/personal-invitation/personal-guest-greeting';
import { PersonalGuestRsvp } from '@/components/personal-invitation/personal-guest-rsvp';
import { PersonalGuestbook } from '@/components/personal-invitation/personal-guestbook';
import { InvitationTemplateRenderer } from '@/modules/invitation-templates/invitation-template-renderer';

import { createFixtureInvitation } from '../../../../lib/fixture-invitation';
import {
  fixtureGuestToken,
  fixturePartySize,
  getFixtureCookieNames,
  getFixtureTemplateKey,
  getPersistedRsvpStatus,
} from '../../../../lib/fixture-state';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PersonalFixturePageProps = {
  params: Promise<{ guestToken: string; slug: string }>;
  searchParams?: Promise<{
    guestbook?: string | string[] | undefined;
    rsvp?: string | string[] | undefined;
  }>;
};

export default async function PersonalFixturePage({
  params,
  searchParams,
}: PersonalFixturePageProps) {
  const { guestToken, slug } = await params;
  const templateKey = getFixtureTemplateKey(slug);

  if (!templateKey || guestToken !== fixtureGuestToken) {
    notFound();
  }

  const cookieStore = await cookies();
  const cookieNames = getFixtureCookieNames(slug);
  const rsvpStatus = getPersistedRsvpStatus(cookieStore.get(cookieNames.rsvpStatus)?.value);
  const persistedAttendeeCount = Number.parseInt(
    cookieStore.get(cookieNames.attendeeCount)?.value ?? '',
    10,
  );
  const rsvpAttendeeCount =
    rsvpStatus === 'attending' &&
    Number.isInteger(persistedAttendeeCount) &&
    persistedAttendeeCount >= 1 &&
    persistedAttendeeCount <= fixturePartySize
      ? persistedAttendeeCount
      : null;
  const guestbookMessage = cookieStore.get(cookieNames.guestbookMessage)?.value ?? null;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const guestbookFeedback =
    resolvedSearchParams?.guestbook === 'success'
      ? 'success'
      : resolvedSearchParams?.guestbook === 'error'
        ? 'error'
        : undefined;
  const rsvpFeedback = resolvedSearchParams?.rsvp === 'success' ? 'success' : undefined;

  return (
    <main className="bg-seraya-ivory min-h-screen px-0 py-0 sm:px-6 sm:py-8">
      <InvitationTemplateRenderer
        invitation={createFixtureInvitation(templateKey)}
        personalSlots={{
          greeting: <PersonalGuestGreeting displayName="Tamu Browser" />,
          guestbook: (
            <PersonalGuestbook
              entry={
                guestbookMessage
                  ? {
                      message: guestbookMessage,
                      updatedAt: '2026-07-25T00:00:00.000Z',
                    }
                  : null
              }
              feedback={guestbookFeedback}
              guestToken={guestToken}
              slug={slug}
            />
          ),
          rsvp: (
            <PersonalGuestRsvp
              feedback={rsvpFeedback}
              guestToken={guestToken}
              partySize={fixturePartySize}
              rsvpAttendeeCount={rsvpAttendeeCount}
              rsvpStatus={rsvpStatus}
              slug={slug}
            />
          ),
        }}
        surface="personal"
        templateKey={templateKey}
      />
    </main>
  );
}
