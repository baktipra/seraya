import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PersonalGuestGreeting } from '@/components/personal-invitation/personal-guest-greeting';
import { PersonalGuestRsvp } from '@/components/personal-invitation/personal-guest-rsvp';
import { PersonalGuestbook } from '@/components/personal-invitation/personal-guestbook';
import { createDefaultInvitationDraftContent } from '@/modules/invitations/invitation-draft.defaults';

import { InvitationTemplateRenderer } from '../invitation-template-renderer';
import { createInvitationViewModel } from '../invitation-view-model';

const project = {
  default_timezone: 'Asia/Jakarta',
  event_date_primary: '2027-08-17',
  person_one_name: 'Raka',
  person_two_name: 'Nadia',
};

function createInvitation() {
  const content = createDefaultInvitationDraftContent(project);
  content.closing = {
    enabled: true,
    message: 'Terima kasih atas doa terbaik Anda.',
    signature: 'Raka & Nadia',
  };
  content.digitalGift = {
    accounts: [
      {
        accountHolder: 'Raka Pratama',
        accountNumber: '123456789012',
        id: '11111111-1111-4111-8111-111111111111',
        providerName: 'Bank Seraya',
      },
    ],
    enabled: true,
    heading: 'Amplop Digital',
    lead: 'Terima kasih atas doa terbaik Anda.',
  };

  return createInvitationViewModel({
    draft: { content },
    project: { event_date_primary: project.event_date_primary },
  });
}

function authorizedSlots() {
  return {
    greeting: <PersonalGuestGreeting displayName="Keluarga Budi" />,
    guestbook: <PersonalGuestbook entry={null} guestToken="capability-token" slug="raka-nadia" />,
    rsvp: (
      <PersonalGuestRsvp
        guestToken="capability-token"
        partySize={3}
        rsvpAttendeeCount={null}
        rsvpStatus="pending"
        slug="raka-nadia"
      />
    ),
  };
}

function genericNoteFragment(html: string) {
  return html.match(/<p[^>]*data-generic-response-note[^>]*>.*?<\/p>/)?.[0] ?? '';
}

describe('SRY-033 generic-personal invitation composition', () => {
  it.each(['roselle', 'aruna', 'laras'] as const)(
    'keeps %s generic response-free while rendering one quiet note without interactive markup',
    (templateKey) => {
      const html = renderToStaticMarkup(
        <InvitationTemplateRenderer
          invitation={createInvitation()}
          surface="generic"
          templateKey={templateKey}
        />,
      );
      const note = genericNoteFragment(html);

      expect(html).not.toContain('data-personal-guest-greeting');
      expect(html).not.toContain('data-personal-guest-rsvp');
      expect(html).not.toContain('data-personal-guestbook');
      expect(html).not.toContain('data-template-response-journey');
      expect(html).not.toContain('data-template-response-slot');
      expect(html).not.toContain(`id="${templateKey}-rsvp-title"`);
      expect(note).toContain('Konfirmasi kehadiran dan ucapan dapat dikirim');
      expect(note).not.toContain('<a');
      expect(note).not.toContain('<button');
      expect(note).not.toContain('<form');
      expect(note).not.toContain('<input');
    },
  );

  it.each(['roselle', 'aruna', 'laras'] as const)(
    'places actual authorized response forms inside the %s-owned response journey',
    (templateKey) => {
      const html = renderToStaticMarkup(
        <InvitationTemplateRenderer
          invitation={createInvitation()}
          personalSlots={authorizedSlots()}
          surface="personal"
          templateKey={templateKey}
        />,
      );

      const greetingIndex = html.indexOf('data-template-personal-greeting');
      const giftIndex = html.indexOf(`${templateKey}-digital-gift-title`);
      const responseIndex = html.indexOf(`data-template-response-journey="${templateKey}"`);
      const rsvpIndex = html.indexOf('data-template-response-slot="rsvp"');
      const guestbookIndex = html.indexOf('data-template-response-slot="guestbook"');
      const closingIndex = html.indexOf(`${templateKey}-closing-title`);

      expect(greetingIndex).toBeGreaterThanOrEqual(0);
      expect(giftIndex).toBeGreaterThan(greetingIndex);
      expect(responseIndex).toBeGreaterThan(giftIndex);
      expect(rsvpIndex).toBeGreaterThanOrEqual(responseIndex);
      expect(guestbookIndex).toBeGreaterThan(rsvpIndex);
      expect(closingIndex).toBeGreaterThan(guestbookIndex);
      expect(html).toContain('data-personal-guest-rsvp="true"');
      expect(html).toContain('data-personal-guestbook="true"');
      expect(html).toContain('action="/raka-nadia/g/capability-token/rsvp"');
      expect(html).toContain('action="/raka-nadia/g/capability-token/guestbook"');
      expect(html).not.toContain('data-generic-response-note');
    },
  );

  it.each(['roselle', 'aruna', 'laras'] as const)(
    'does not leave an empty RSVP slot wrapper when only Guestbook is available on %s',
    (templateKey) => {
      const html = renderToStaticMarkup(
        <InvitationTemplateRenderer
          invitation={createInvitation()}
          personalSlots={{ guestbook: authorizedSlots().guestbook }}
          surface="personal"
          templateKey={templateKey}
        />,
      );

      expect(html).toContain(`data-template-response-journey="${templateKey}"`);
      expect(html).toContain('data-template-response-slot="guestbook"');
      expect(html).not.toContain('data-template-response-slot="rsvp"');
    },
  );
});
