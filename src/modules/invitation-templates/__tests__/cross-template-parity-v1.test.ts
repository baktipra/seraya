import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it } from 'vitest';

import {
  invitationTemplateParityIds,
  invitationTemplateParityV1,
} from '../invitation-template-parity';
import { invitationTemplateRegistry } from '../invitation-template.registry';
import type {
  InvitationRenderSurfaceV1,
  InvitationTemplateId,
  PersonalInvitationPresentationSlotsV1,
} from '../invitation-template.types';
import type { InvitationViewModel } from '../invitation-view-model';

const fullInvitation: InvitationViewModel = {
  closing: {
    message: 'Terima kasih telah menyertai perjalanan panjang keluarga kami.',
    signature: 'Kirana & Arga',
  },
  couple: {
    personOne: {
      displayName: 'Kirana Ayu Prameswari dengan Nama Panggilan yang Panjang',
      fullName: 'Kirana Ayu Prameswari Kusumaningrum',
      parentLine:
        'Putri pertama dari Bapak Mahendra Prasetya dan Ibu Ratih Kusumaningrum beserta keluarga besar',
    },
    personTwo: {
      displayName: 'Arga Dananjaya Wicaksana dengan Nama Panggilan yang Panjang',
      fullName: 'Arga Dananjaya Wicaksana Purnamadewa',
      parentLine:
        'Putra kedua dari Bapak Baskara Wicaksana dan Ibu Larasati Purnamadewi beserta keluarga besar',
    },
  },
  digitalGift: {
    accounts: [
      {
        accountHolder: 'Kirana Ayu Prameswari Kusumaningrum',
        accountNumber: '123456789012345678901234567890',
        id: 'gift-1',
        providerName: 'Bank Keluarga Nusantara Internasional',
      },
    ],
    heading: 'Tanda kasih untuk perjalanan baru',
    lead: 'Kehadiran dan doa Anda merupakan hadiah terindah bagi keluarga kami.',
  },
  events: {
    items: [
      {
        address:
          'Assembly Hall, Jakarta Convention Center, Jalan Jenderal Gatot Subroto, Gelora, Tanah Abang, Jakarta Pusat 10270',
        dateLabel: '17 Agustus 2027',
        mapsHref: 'https://maps.example.com/evening-programme',
        timeLabel: '18.30–21.00 WIB',
        title: 'Resepsi, Jamuan Malam, dan Perayaan Bersama Seluruh Keluarga Besar',
        venueName: 'Jakarta Convention Center — Assembly Hall Utama',
      },
    ],
    primaryDateLabel: '17 Agustus 2027',
  },
  gallery: {
    images: [
      {
        alt: 'Potret pasangan untuk pengujian parity koleksi Seraya',
        id: 'gallery-1',
        src: 'https://images.example.com/gallery-1.jpg',
      },
    ],
  },
  hero: {
    eyebrow: 'The Wedding Of',
    primaryDateLabel: '17 Agustus 2027',
    subtitle: 'Dengan penuh syukur, kami mengundang Anda untuk hadir bersama keluarga.',
    title: 'Kirana & Arga',
  },
  location: {
    address: 'Jalan Perayaan Keluarga Nomor 123, Kecamatan Kebahagiaan, Kota Jakarta, Indonesia',
    mapsHref: 'https://maps.example.com/main-venue',
    venueName: 'Gedung Perayaan Keluarga Nusantara',
  },
  rsvp: {
    heading: 'Konfirmasi Kehadiran',
    lead: 'Mohon konfirmasikan kehadiran Anda.',
  },
  story: {
    body: 'Cerita panjang yang menjaga seluruh isi undangan tetap hadir tanpa dipotong oleh art direction template.',
    heading: 'Perjalanan yang membawa kami pulang',
  },
};

const privateSlots: PersonalInvitationPresentationSlotsV1 = {
  greeting: createElement(
    'span',
    { 'data-parity-private-slot': 'greeting' },
    'PRIVATE_GREETING_CONTENT',
  ),
  guestbook: createElement(
    'span',
    { 'data-parity-private-slot': 'guestbook' },
    'PRIVATE_GUESTBOOK_CONTENT',
  ),
  rsvp: createElement('span', { 'data-parity-private-slot': 'rsvp' }, 'PRIVATE_RSVP_CONTENT'),
};

function renderTemplate({
  invitation = fullInvitation,
  personalSlots = privateSlots,
  surface,
  templateId,
}: {
  invitation?: InvitationViewModel;
  personalSlots?: PersonalInvitationPresentationSlotsV1;
  surface: InvitationRenderSurfaceV1;
  templateId: InvitationTemplateId;
}) {
  const Template = invitationTemplateRegistry[templateId];

  return renderToStaticMarkup(
    createElement(Template, {
      invitation,
      renderContext: {
        personalSlots,
        surface,
      },
    }),
  );
}

function countToken(value: string, token: string) {
  return value.split(token).length - 1;
}

function createPrivateSlot(kind: 'greeting' | 'guestbook' | 'rsvp'): ReactNode {
  return createElement('span', { 'data-parity-private-slot': kind }, `PRIVATE_${kind}`);
}

const templateSources = {
  aruna: readFileSync(
    join(process.cwd(), 'src/modules/invitation-templates/aruna/aruna-template.tsx'),
    'utf8',
  ),
  laras: readFileSync(
    join(process.cwd(), 'src/modules/invitation-templates/laras/laras-template.tsx'),
    'utf8',
  ),
  roselle: [
    readFileSync(
      join(process.cwd(), 'src/modules/invitation-templates/roselle/roselle-template.tsx'),
      'utf8',
    ),
    readFileSync(
      join(process.cwd(), 'src/modules/invitation-templates/roselle/roselle-sections.tsx'),
      'utf8',
    ),
  ].join('\n'),
} satisfies Record<InvitationTemplateId, string>;

const parityStyles = readFileSync(
  join(
    process.cwd(),
    'src/modules/invitation-templates/invitation-template-parity-boundary.module.css',
  ),
  'utf8',
);

describe('Slice G4 cross-template parity contract', () => {
  it('keeps one complete parity descriptor for every registered template', () => {
    expect(Object.keys(invitationTemplateRegistry).sort()).toEqual(
      [...invitationTemplateParityIds].sort(),
    );
    expect(
      new Set(Object.values(invitationTemplateParityV1).map(({ identity }) => identity)).size,
    ).toBe(invitationTemplateParityIds.length);
    expect(
      new Set(
        Object.values(invitationTemplateParityV1).map(({ experienceValue }) => experienceValue),
      ).size,
    ).toBe(invitationTemplateParityIds.length);
  });

  it.each(invitationTemplateParityIds)(
    '%s keeps generic and preview surfaces free from accidental personal slots',
    (templateId) => {
      const descriptor = invitationTemplateParityV1[templateId];

      for (const surface of ['generic', 'preview'] as const) {
        const html = renderTemplate({ surface, templateId });

        expect(html).toContain('data-invitation-parity="v1"');
        expect(html).toContain(`data-parity-identity="${descriptor.identity}"`);
        expect(html).toContain(`data-template="${templateId}"`);
        expect(html).toContain(`${descriptor.experienceHook}="${descriptor.experienceValue}"`);
        expect(html).toContain(`href="#${descriptor.coupleAnchorId}"`);
        expect(html).not.toContain('PRIVATE_GREETING_CONTENT');
        expect(html).not.toContain('PRIVATE_RSVP_CONTENT');
        expect(html).not.toContain('PRIVATE_GUESTBOOK_CONTENT');
        expect(html).not.toContain('data-template-personal-greeting');
        expect(html).not.toContain('data-template-response-journey');
        expect(html).not.toContain('data-template-response-slot');
        expect(countToken(html, 'data-generic-response-note=')).toBe(1);
      }
    },
  );

  it.each(invitationTemplateParityIds)(
    '%s keeps the authorized personal journey ordered and removes the generic note',
    (templateId) => {
      const descriptor = invitationTemplateParityV1[templateId];
      const html = renderTemplate({ surface: 'personal', templateId });
      const openingIndex = html.indexOf('data-invitation-opening-action');
      const greetingIndex = html.indexOf('PRIVATE_GREETING_CONTENT');
      const coupleIndex = html.indexOf(`id="${descriptor.coupleAnchorId}"`);
      const responseIndex = html.indexOf('data-template-response-journey');
      const rsvpIndex = html.indexOf('PRIVATE_RSVP_CONTENT');
      const guestbookIndex = html.indexOf('PRIVATE_GUESTBOOK_CONTENT');

      expect(html).toContain(`href="#${descriptor.greetingAnchorId}"`);
      expect(openingIndex).toBeGreaterThan(-1);
      expect(greetingIndex).toBeGreaterThan(openingIndex);
      expect(coupleIndex).toBeGreaterThan(greetingIndex);
      expect(responseIndex).toBeGreaterThan(coupleIndex);
      expect(rsvpIndex).toBeGreaterThan(responseIndex);
      expect(guestbookIndex).toBeGreaterThan(rsvpIndex);
      expect(countToken(html, 'data-template-response-slot=')).toBe(2);
      expect(html).not.toContain('data-generic-response-note');
    },
  );

  it.each(invitationTemplateParityIds)(
    '%s removes optional chapters cleanly without breaking the core journey',
    (templateId) => {
      const descriptor = invitationTemplateParityV1[templateId];
      const invitationWithoutOptionalContent: InvitationViewModel = {
        ...fullInvitation,
        closing: null,
        digitalGift: null,
        events: null,
        gallery: null,
        location: null,
        rsvp: null,
        story: null,
      };
      const html = renderTemplate({
        invitation: invitationWithoutOptionalContent,
        personalSlots: {},
        surface: 'personal',
        templateId,
      });

      expect(html).toContain(`id="${descriptor.invitationTitleId}"`);
      expect(html).toContain(`id="${descriptor.coupleAnchorId}"`);
      expect(html).toContain('data-invitation-opening-action');
      expect(html).toContain('data-invitation-return-action');
      expect(html).not.toContain('data-invitation-schedule-journey');
      expect(html).not.toContain('data-invitation-gallery');
      expect(html).not.toContain(`id="${templateId}-story-title"`);
      expect(html).not.toContain(`id="${templateId}-gallery-title"`);
      expect(html).not.toContain(`id="${templateId}-digital-gift-title"`);
      expect(html).not.toContain(`id="${templateId}-closing-title"`);
      expect(html).not.toContain('data-template-response-journey');
    },
  );

  it.each(invitationTemplateParityIds)(
    '%s supports RSVP-only, Guestbook-only, and empty personal response combinations',
    (templateId) => {
      const rsvpOnly = renderTemplate({
        personalSlots: { rsvp: createPrivateSlot('rsvp') },
        surface: 'personal',
        templateId,
      });
      const guestbookOnly = renderTemplate({
        personalSlots: { guestbook: createPrivateSlot('guestbook') },
        surface: 'personal',
        templateId,
      });
      const empty = renderTemplate({ personalSlots: {}, surface: 'personal', templateId });

      expect(rsvpOnly).toContain('data-template-response-slot="rsvp"');
      expect(rsvpOnly).not.toContain('data-template-response-slot="guestbook"');
      expect(countToken(rsvpOnly, 'data-template-response-slot=')).toBe(1);

      expect(guestbookOnly).toContain('data-template-response-slot="guestbook"');
      expect(guestbookOnly).not.toContain('data-template-response-slot="rsvp"');
      expect(countToken(guestbookOnly, 'data-template-response-slot=')).toBe(1);

      expect(empty).not.toContain('data-template-response-journey');
      expect(empty).not.toContain('data-template-response-slot');
      expect(empty).not.toContain('data-generic-response-note');
    },
  );

  it.each(invitationTemplateParityIds)(
    '%s preserves the shared content and interaction hooks without flattening art direction',
    (templateId) => {
      const source = templateSources[templateId];

      for (const hook of [
        'data-invitation-opening-action',
        'data-template-personal-greeting',
        'data-invitation-schedule-journey',
        'data-schedule-event',
        'data-invitation-gallery',
        'data-template-response-journey',
        'data-template-response-slot="rsvp"',
        'data-template-response-slot="guestbook"',
        'data-generic-response-note',
        'data-invitation-return-action',
      ]) {
        expect(source).toContain(hook);
      }

      for (const contentField of [
        'person.displayName',
        'person.fullName',
        'person.parentLine',
        'event.title',
        'event.dateLabel',
        'event.timeLabel',
        'event.venueName',
        'event.address',
        'event.mapsHref',
        'account.providerName',
        'account.accountHolder',
        'account.accountNumber',
      ]) {
        expect(source).toContain(contentField);
      }

      expect(source).toContain('rel="noopener noreferrer"');
      expect(source).toContain('target="_blank"');
    },
  );

  it('adds only neutral collection-wide long-content, mobile, and motion safeguards', () => {
    expect(parityStyles).toContain('display: contents');
    expect(parityStyles).toContain('overflow-wrap: anywhere');
    expect(parityStyles).toContain('min-width: 0');
    expect(parityStyles).toContain('@media (max-width: 36rem)');
    expect(parityStyles).toContain('touch-action: manipulation');
    expect(parityStyles).toContain('@media (prefers-reduced-motion: reduce)');
    expect(parityStyles).toContain('scroll-behavior: auto');
  });
});
