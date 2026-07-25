import type { GuestRsvpStatus } from '@/modules/guests/guest.types';
import type { InvitationTemplateKey } from '@/modules/invitation-templates/invitation-template.keys';

const templateKeys: InvitationTemplateKey[] = ['roselle', 'aruna', 'laras'];

export const fixtureGuestToken = 'browser-fixture';
export const fixturePartySize = 4;
export const forcedGuestbookErrorMessage = '__force_error__';

export function getFixtureTemplateKey(slug: string): InvitationTemplateKey | null {
  const templateKey = slug.replace(/^e2e-/, '') as InvitationTemplateKey;
  return templateKeys.includes(templateKey) ? templateKey : null;
}

export function getFixtureCookieNames(slug: string) {
  const safeSlug = slug.replace(/[^a-z0-9-]/gi, '-').toLowerCase();

  return {
    attendeeCount: `j1re-${safeSlug}-attendee-count`,
    guestbookMessage: `j1re-${safeSlug}-guestbook-message`,
    rsvpStatus: `j1re-${safeSlug}-rsvp-status`,
  };
}

export function getPersistedRsvpStatus(value: string | undefined): GuestRsvpStatus {
  return value === 'attending' || value === 'declined' ? value : 'pending';
}
