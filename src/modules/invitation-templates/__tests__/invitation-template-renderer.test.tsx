import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

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
  return createInvitationViewModel({
    draft: { content: createDefaultInvitationDraftContent(project) },
    project: { event_date_primary: project.event_date_primary },
  });
}

function personalSlots() {
  return {
    greeting: <div data-personal-slot="greeting">Untuk Keluarga Budi</div>,
    guestbook: <div data-personal-slot="guestbook">Ucapan &amp; Doa pribadi</div>,
    rsvp: <div data-personal-slot="rsvp">Konfirmasi pribadi</div>,
  };
}

describe('SRY-032 invitation template render surfaces', () => {
  it('keeps InvitationViewModel limited to public invitation content', () => {
    const invitation = createInvitation();

    expect(invitation).not.toHaveProperty('guestDisplayName');
    expect(invitation).not.toHaveProperty('partySize');
    expect(invitation).not.toHaveProperty('rsvpStatus');
    expect(invitation).not.toHaveProperty('rsvpAttendeeCount');
    expect(invitation).not.toHaveProperty('guestbookEntry');
    expect(invitation).not.toHaveProperty('guestToken');
    expect(invitation).not.toHaveProperty('personalUrl');
    expect(invitation).not.toHaveProperty('whatsappPhoneE164');
    expect(invitation).not.toHaveProperty('guestId');
    expect(invitation).not.toHaveProperty('deliveryState');
    expect(invitation).not.toHaveProperty('payment');
  });

  it.each(['generic', 'preview'] as const)(
    'suppresses accidental personal slots on %s surface for every template',
    (surface) => {
      for (const templateKey of ['roselle', 'aruna', 'laras'] as const) {
        const html = renderToStaticMarkup(
          <InvitationTemplateRenderer
            invitation={createInvitation()}
            personalSlots={personalSlots()}
            surface={surface}
            templateKey={templateKey}
          />,
        );

        expect(html).not.toContain('data-personal-slot');
        expect(html).not.toContain('Untuk Keluarga Budi');
        expect(html).not.toContain('Konfirmasi pribadi');
        expect(html).not.toContain('Ucapan &amp; Doa pribadi');
      }
    },
  );

  it.each(['roselle', 'aruna', 'laras'] as const)(
    'places greeting, RSVP, and Guestbook slots through the %s template on personal surface',
    (templateKey) => {
      const html = renderToStaticMarkup(
        <InvitationTemplateRenderer
          invitation={createInvitation()}
          personalSlots={personalSlots()}
          surface="personal"
          templateKey={templateKey}
        />,
      );

      expect(html).toContain(`data-template="${templateKey}"`);
      expect(html).toContain('data-personal-slot="greeting"');
      expect(html).toContain('data-personal-slot="rsvp"');
      expect(html).toContain('data-personal-slot="guestbook"');
      expect(html.indexOf('data-personal-slot="greeting"')).toBeLessThan(
        html.indexOf(`data-template="${templateKey}"`),
      );
      expect(html.indexOf(`data-template="${templateKey}"`)).toBeLessThan(
        html.indexOf('data-personal-slot="rsvp"'),
      );
      expect(html.indexOf('data-personal-slot="rsvp"')).toBeLessThan(
        html.indexOf('data-personal-slot="guestbook"'),
      );
    },
  );
});
