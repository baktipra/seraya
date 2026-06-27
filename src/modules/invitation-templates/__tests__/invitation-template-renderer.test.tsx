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

function createInvitation({ rsvpEnabled = true } = {}) {
  const content = createDefaultInvitationDraftContent(project);
  content.rsvp.enabled = rsvpEnabled;
  content.closing = {
    enabled: true,
    message: 'Terima kasih atas doa terbaik Anda.',
    signature: 'Raka & Nadia',
  };

  return createInvitationViewModel({
    draft: { content },
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

function countMatches(value: string, expression: RegExp) {
  return value.match(expression)?.length ?? 0;
}

describe('SRY-033 invitation template render surfaces', () => {
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
    'suppresses personal slots and static RSVP UI on %s surface for every template',
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
        expect(html).not.toContain(`id="${templateKey}-rsvp-title"`);
        expect(html).not.toContain('Konfirmasi kehadiran akan segera tersedia.');
        expect(html).not.toContain('data-template-personal-greeting');
        expect(html).not.toContain('data-template-response-journey');
        expect(html).not.toContain('data-template-response-slot');
        expect(countMatches(html, /data-generic-response-note/g)).toBe(1);
        expect(html).toContain(
          'Konfirmasi kehadiran dan ucapan dapat dikirim melalui undangan pribadi dari pasangan.',
        );
      }
    },
  );

  it.each(['roselle', 'aruna', 'laras'] as const)(
    'omits the quiet generic response note when RSVP is not enabled for %s',
    (templateKey) => {
      const html = renderToStaticMarkup(
        <InvitationTemplateRenderer
          invitation={createInvitation({ rsvpEnabled: false })}
          surface="generic"
          templateKey={templateKey}
        />,
      );

      expect(html).not.toContain('data-generic-response-note');
      expect(html).not.toContain('Konfirmasi kehadiran dan ucapan dapat dikirim');
    },
  );

  it.each(['roselle', 'aruna', 'laras'] as const)(
    'places greeting, RSVP, and Guestbook slots inside the %s template journey on personal surface',
    (templateKey) => {
      const html = renderToStaticMarkup(
        <InvitationTemplateRenderer
          invitation={createInvitation()}
          personalSlots={personalSlots()}
          surface="personal"
          templateKey={templateKey}
        />,
      );

      const templateStart = html.indexOf(`data-template="${templateKey}"`);
      const greetingIndex = html.indexOf('data-template-personal-greeting');
      const rsvpIndex = html.indexOf('data-template-response-slot="rsvp"');
      const guestbookIndex = html.indexOf('data-template-response-slot="guestbook"');
      const closingIndex = html.indexOf(`${templateKey}-closing-title`);

      expect(templateStart).toBeGreaterThanOrEqual(0);
      expect(greetingIndex).toBeGreaterThan(templateStart);
      expect(rsvpIndex).toBeGreaterThan(greetingIndex);
      expect(guestbookIndex).toBeGreaterThan(rsvpIndex);
      expect(closingIndex).toBeGreaterThan(guestbookIndex);
      expect(html).toContain(`data-template-response-journey="${templateKey}"`);
      expect(html).not.toContain('data-generic-response-note');
      expect(html).not.toContain(`id="${templateKey}-rsvp-title"`);
    },
  );
});
