import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PersonalGuestRsvp } from '@/components/personal-invitation/personal-guest-rsvp';
import { createDefaultInvitationDraftContent } from '@/modules/invitations/invitation-draft.defaults';

import { InvitationTemplateRenderer } from '../invitation-template-renderer';
import type { InvitationTemplateKey } from '../invitation-template.keys';
import { createInvitationViewModel } from '../invitation-view-model';

const project = {
  default_timezone: 'Asia/Jakarta',
  event_date_primary: '2027-08-17',
  person_one_name: 'Raka',
  person_two_name: 'Nadia',
};

const templateKeys: InvitationTemplateKey[] = ['roselle', 'aruna', 'laras'];

function createInvitation(rsvpEnabled: boolean) {
  const content = createDefaultInvitationDraftContent(project);
  content.rsvp = {
    enabled: rsvpEnabled,
    heading: rsvpEnabled ? 'Konfirmasi Kehadiran' : null,
    lead: rsvpEnabled ? 'Kami menantikan kabar Anda.' : null,
  };

  return createInvitationViewModel({
    draft: { content },
    project: { event_date_primary: project.event_date_primary },
  });
}

describe('J1R-B personal response contract', () => {
  it.each(templateKeys)(
    'keeps the quiet generic response handoff truthful when RSVP is disabled with %s',
    (templateKey) => {
      const html = renderToStaticMarkup(
        <InvitationTemplateRenderer
          invitation={createInvitation(false)}
          surface="generic"
          templateKey={templateKey}
        />,
      );

      expect(html).toContain(`data-generic-response-note="${templateKey}"`);
      expect(html).toContain('Ucapan dapat dikirim melalui undangan pribadi dari pasangan.');
      expect(html).not.toContain(
        'Konfirmasi kehadiran dan ucapan dapat dikirim melalui undangan pribadi dari pasangan.',
      );
      expect(html).not.toContain('data-template-response-journey');
    },
  );

  it.each(templateKeys)(
    'mentions both RSVP and guestbook in the generic handoff when RSVP is enabled with %s',
    (templateKey) => {
      const html = renderToStaticMarkup(
        <InvitationTemplateRenderer
          invitation={createInvitation(true)}
          surface="generic"
          templateKey={templateKey}
        />,
      );

      expect(html).toContain(
        'Konfirmasi kehadiran dan ucapan dapat dikirim melalui undangan pribadi dari pasangan.',
      );
    },
  );

  it.each(templateKeys)(
    'introduces the authorized personal response journey before its slots with %s',
    (templateKey) => {
      const html = renderToStaticMarkup(
        <InvitationTemplateRenderer
          invitation={createInvitation(true)}
          personalSlots={{
            guestbook: <p data-fixture="guestbook">Ucapan fixture</p>,
            rsvp: <p data-fixture="rsvp">RSVP fixture</p>,
          }}
          surface="personal"
          templateKey={templateKey}
        />,
      );

      const introductionIndex = html.indexOf(
        `data-template-response-introduction="${templateKey}"`,
      );
      const rsvpIndex = html.indexOf('data-template-response-slot="rsvp"');
      const guestbookIndex = html.indexOf('data-template-response-slot="guestbook"');

      expect(introductionIndex).toBeGreaterThan(-1);
      expect(rsvpIndex).toBeGreaterThan(introductionIndex);
      expect(guestbookIndex).toBeGreaterThan(rsvpIndex);
      expect(html).toContain('Kabar dari Anda');
      expect(html).not.toContain('data-generic-response-note');
    },
  );

  it('starts a pending RSVP without an implicit attendance choice', () => {
    const html = renderToStaticMarkup(
      <PersonalGuestRsvp
        guestToken="guest-token"
        partySize={4}
        rsvpAttendeeCount={null}
        rsvpStatus="pending"
        slug="raka-nadia"
      />,
    );

    expect(html.match(/data-selected="true"/g)).toBeNull();
    expect(html.match(/data-selected="false"/g)).toHaveLength(2);
    expect(html).toContain('Pilih status kehadiran sebelum menyimpan konfirmasi.');
    expect(html).toContain('disabled=""');
    expect(html).not.toContain('data-personal-rsvp-attendance="true"');
  });

  it('preserves an attending response and its bounded attendee-count controls', () => {
    const html = renderToStaticMarkup(
      <PersonalGuestRsvp
        guestToken="guest-token"
        partySize={4}
        rsvpAttendeeCount={2}
        rsvpStatus="attending"
        slug="raka-nadia"
      />,
    );

    expect(html.match(/data-selected="true"/g)).toHaveLength(1);
    expect(html).not.toContain('disabled=""');
    expect(html).toContain('data-personal-rsvp-attendance="true"');
    expect(html.match(/<option/g)).toHaveLength(4);
  });

  it('preserves a declined response without exposing attendee-count controls', () => {
    const html = renderToStaticMarkup(
      <PersonalGuestRsvp
        guestToken="guest-token"
        partySize={4}
        rsvpAttendeeCount={null}
        rsvpStatus="declined"
        slug="raka-nadia"
      />,
    );

    expect(html.match(/data-selected="true"/g)).toHaveLength(1);
    expect(html).not.toContain('disabled=""');
    expect(html).not.toContain('data-personal-rsvp-attendance="true"');
  });
});
