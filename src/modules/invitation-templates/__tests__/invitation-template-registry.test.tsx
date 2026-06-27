import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { createDefaultInvitationDraftContent } from '@/modules/invitations/invitation-draft.defaults';
import { normalizePublishedInvitationSnapshot } from '@/modules/publications/published-invitation.schema';

import { InvitationTemplateRenderer } from '../invitation-template-renderer';
import { getInvitationTemplate, invitationTemplateRegistry } from '../invitation-template.registry';
import { createInvitationViewModel } from '../invitation-view-model';

const project = {
  default_timezone: 'Asia/Jakarta',
  event_date_primary: '2027-08-17',
  person_one_name: 'Raka',
  person_two_name: 'Nadia',
};

function createCompleteInvitation() {
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
      {
        accountHolder: 'Nadia Putri',
        accountNumber: '987654321098',
        id: '22222222-2222-4222-8222-222222222222',
        providerName: 'E-wallet Seraya',
      },
    ],
    enabled: true,
    heading: 'Amplop Digital',
    lead: 'Terima kasih atas doa terbaik Anda.',
  };
  const primaryScheduleEvent = content.eventSchedule.events[0]!;
  content.eventSchedule = {
    events: [
      {
        ...primaryScheduleEvent,
        date: '2027-08-17',
        endTime: '10:00',
        mapsUrl: 'https://maps.example.test/raka-nadia',
        startTime: '08:00',
        title: 'Akad Nikah',
        venueAddress: 'Jalan Mawar No. 1, Jakarta',
        venueName: 'Gedung Bahagia',
      },
      {
        ...primaryScheduleEvent,
        date: '2027-08-17',
        endTime: '14:00',
        id: '11111111-1111-4111-8111-111111111111',
        mapsUrl: null,
        startTime: '11:00',
        title: 'Resepsi',
        venueAddress: null,
        venueName: null,
      },
    ],
  };
  content.gallery = {
    enabled: true,
    imageIds: ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'],
  };
  content.rsvp = {
    enabled: true,
    heading: 'Konfirmasi Kehadiran',
    lead: 'Kami menantikan kehadiran Anda.',
  };
  content.story = {
    body: 'Kami bertemu dalam perjalanan yang sederhana.',
    enabled: true,
    heading: 'Cerita kami',
  };

  return createInvitationViewModel({
    draft: { content },
    galleryImages: [
      { alt: 'Foto pasangan 1', id: content.gallery.imageIds[0]!, src: '/media/one' },
      { alt: 'Foto pasangan 2', id: content.gallery.imageIds[1]!, src: '/media/two' },
    ],
    project: { event_date_primary: project.event_date_primary },
  });
}

describe('SRY-025 invitation template registry', () => {
  it('registers three distinct real template renderers', () => {
    expect(Object.keys(invitationTemplateRegistry).sort()).toEqual(['aruna', 'laras', 'roselle']);
    expect(getInvitationTemplate('roselle')).not.toBe(getInvitationTemplate('aruna'));
    expect(getInvitationTemplate('aruna')).not.toBe(getInvitationTemplate('laras'));
    expect(getInvitationTemplate('laras')).not.toBe(getInvitationTemplate('roselle'));
  });

  it.each(['roselle', 'aruna', 'laras'] as const)(
    'renders complete supported invitation content with %s',
    (templateKey) => {
      const html = renderToStaticMarkup(
        <InvitationTemplateRenderer
          invitation={createCompleteInvitation()}
          surface="generic"
          templateKey={templateKey}
        />,
      );

      expect(html).toContain(`data-template="${templateKey}"`);
      expect(html).toContain('Raka');
      expect(html).toContain('Nadia');
      expect(html).toContain('Cerita kami');
      expect(html).toContain('Akad Nikah');
      expect(html).toContain('Resepsi');
      expect(html).toContain('Gedung Bahagia');
      expect(html).toContain('Buka peta acara (tab baru)');
      expect(html).toContain('src="/media/one"');
      expect(html).toContain('src="/media/two"');
      expect(html.indexOf('src="/media/one"')).toBeLessThan(html.indexOf('src="/media/two"'));
      expect(html).toContain('Konfirmasi Kehadiran');
      expect(html).toContain('Amplop Digital');
      expect(html).toContain('Bank Seraya');
      expect(html).toContain('Raka Pratama');
      expect(html).toContain('123456789012');
      expect(html).toContain('E-wallet Seraya');
      expect(html.indexOf('123456789012')).toBeLessThan(html.indexOf('987654321098'));
      expect(html).toContain('Salin nomor');
      expect(html).toContain('Terima kasih atas doa terbaik Anda.');
    },
  );

  it.each(['roselle', 'aruna', 'laras'] as const)(
    'renders multi-event schedule data with distinct %s schedule markup and no duplicate location block',
    (templateKey) => {
      const html = renderToStaticMarkup(
        <InvitationTemplateRenderer
          invitation={createCompleteInvitation()}
          surface="generic"
          templateKey={templateKey}
        />,
      );

      expect(html.match(new RegExp(`data-schedule-event=\"${templateKey}\"`, 'g'))).toHaveLength(2);
      expect(html).toContain('Akad Nikah');
      expect(html).toContain('Resepsi');
      expect(html).toContain('Buka peta acara (tab baru)');
      expect(html).not.toContain('Buka peta lokasi (tab baru)');
      expect(html).not.toContain('<iframe');
    },
  );

  it.each([
    ['roselle', 'roselle-digital-gift-title'],
    ['aruna', 'aruna-digital-gift-title'],
    ['laras', 'laras-digital-gift-title'],
  ] as const)(
    'uses dedicated Amplop Digital markup for %s',
    (templateKey, digitalGiftHeadingId) => {
      const html = renderToStaticMarkup(
        <InvitationTemplateRenderer
          invitation={createCompleteInvitation()}
          surface="generic"
          templateKey={templateKey}
        />,
      );

      expect(html).toContain(`id="${digitalGiftHeadingId}"`);
    },
  );

  it.each(['roselle', 'aruna', 'laras'] as const)(
    'hides Amplop Digital after the legacy snapshot compatibility boundary with %s',
    (templateKey) => {
      const content = createDefaultInvitationDraftContent(project);
      const legacyDraft = { ...content };
      delete (legacyDraft as Partial<typeof legacyDraft>).digitalGift;
      const snapshot = normalizePublishedInvitationSnapshot({
        draft: legacyDraft,
        project: {
          eventCity: 'Jakarta',
          eventDatePrimary: project.event_date_primary,
          slug: 'raka-nadia',
          timezone: project.default_timezone,
        },
      });

      expect(snapshot?.draft.digitalGift).toEqual({
        accounts: [],
        enabled: false,
        heading: null,
        lead: null,
      });

      const invitation = createInvitationViewModel({
        draft: { content: snapshot!.draft },
        project: { event_date_primary: project.event_date_primary },
      });
      const html = renderToStaticMarkup(
        <InvitationTemplateRenderer
          invitation={invitation}
          surface="generic"
          templateKey={templateKey}
        />,
      );

      expect(html).toContain(`data-template=\"${templateKey}\"`);
      expect(html).not.toContain('Amplop Digital');
      expect(html).not.toContain('Salin nomor');
    },
  );

  it.each(['roselle', 'aruna', 'laras'] as const)(
    'hides optional Story, Location, Gallery, and Closing sections cleanly with %s',
    (templateKey) => {
      const content = createDefaultInvitationDraftContent(project);
      const invitation = createInvitationViewModel({
        draft: { content },
        project: { event_date_primary: project.event_date_primary },
      });
      const html = renderToStaticMarkup(
        <InvitationTemplateRenderer
          invitation={invitation}
          surface="generic"
          templateKey={templateKey}
        />,
      );

      expect(html).not.toContain('src="/media/');
      expect(html).not.toContain('Buka peta lokasi (tab baru)');
      expect(html).not.toContain('Terima kasih atas doa terbaik Anda.');
      expect(html).not.toContain('Amplop Digital');
      expect(html).not.toContain('Salin nomor');
    },
  );
});
