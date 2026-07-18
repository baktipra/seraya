import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { createDefaultInvitationDraftContent } from '@/modules/invitations/invitation-draft.defaults';
import type { InvitationDraft } from '@/modules/invitations/invitation-draft.types';

import { createInvitationViewModel } from '../../invitation-view-model';
import { getEventLayout, getGalleryLayout } from '../roselle-sections';
import { RoselleTemplate } from '../roselle-template';

const project = {
  account_id: '11111111-1111-1111-1111-111111111111',
  default_timezone: 'Asia/Jakarta',
  deleted_at: null,
  event_city: 'Jakarta',
  event_date_primary: '2027-08-17',
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  person_one_name: 'Raka',
  person_two_name: 'Nadia',
  slug: 'raka-nadia',
  status: 'draft',
};

function createDraft(): InvitationDraft {
  return {
    content: createDefaultInvitationDraftContent(project),
    created_at: '2026-06-20T00:00:00.000Z',
    deleted_at: null,
    id: 'draft-private-id',
    project_id: project.id,
    schema_version: 1,
    updated_at: '2026-06-20T00:00:00.000Z',
  };
}

function renderRoselle(
  draft = createDraft(),
  galleryImages: Parameters<typeof createInvitationViewModel>[0]['galleryImages'] = [],
) {
  return renderToStaticMarkup(
    <RoselleTemplate
      invitation={createInvitationViewModel({ draft, galleryImages, project })}
      renderContext={{ surface: 'generic' }}
    />,
  );
}

describe('RoselleTemplate', () => {
  it('renders the default draft as a real invitation while omitting empty optional sections', () => {
    const html = renderRoselle();

    expect(html).toContain('<article');
    expect(html).toContain('The Wedding Of');
    expect(html).toContain('Raka &amp; Nadia');
    expect(html).toContain('17 Agustus 2027');
    expect(html).toContain('Dua cerita, satu perjalanan');
    expect(html).toContain('data-roselle-chapter="opening"');
    expect(html).toContain('Gulir untuk melanjutkan');
    expect(html).toContain('data-event-layout="single"');
    expect(html).toContain('data-generic-response-note="roselle"');
    expect(html).toContain(
      'Konfirmasi kehadiran dan ucapan dapat dikirim melalui undangan pribadi dari pasangan.',
    );
    expect(html).not.toContain('id="roselle-rsvp-title"');
    expect(html).not.toContain('Cerita kami');
    expect(html).not.toContain('Tempat kami bersua');
    expect(html).not.toContain('Buka peta lokasi');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<iframe');
  });

  it('renders enabled factual story, event, location, maps link, and closing values', () => {
    const draft = createDraft();
    draft.content.story = {
      body: 'Kami bertemu dan bertumbuh bersama.',
      enabled: true,
      heading: 'Awal yang baik',
    };
    draft.content.eventSchedule.events = [
      {
        ...draft.content.eventSchedule.events[0]!,
        date: '2027-08-17',
        endTime: '10:30',
        mapsUrl: 'https://www.google.com/maps?q=Jakarta',
        startTime: '09:00',
        title: 'Akad nikah',
        venueAddress: 'Jl. Bahagia No. 1, Jakarta',
        venueName: 'Rumah Bahagia',
      },
    ];
    draft.content.closing = {
      enabled: true,
      message: 'Terima kasih atas doa baiknya.',
      signature: 'Raka & Nadia',
    };

    const html = renderRoselle(draft);

    expect(html).toContain('Awal yang baik');
    expect(html).toContain('Kami bertemu dan bertumbuh bersama.');
    expect(html).toContain('Akad nikah');
    expect(html).toContain('09.00–10.30');
    expect(html).toContain('Rumah Bahagia');
    expect(html).toContain('Jl. Bahagia No. 1, Jakarta');
    expect(html).toContain('href="https://www.google.com/maps?q=Jakarta"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('aria-label="Buka peta Akad nikah di tab baru"');
    expect(html).toContain('>Buka peta</a>');
    expect(html).toContain('Terima kasih atas doa baiknya.');
  });

  it('omits unresolved gallery image IDs and lets React escape unexpected angle brackets as text', () => {
    const draft = createDraft();
    draft.content.gallery = {
      enabled: true,
      imageIds: ['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'],
    };
    draft.content.hero.title = '<b>Raka & Nadia</b>';

    const html = renderRoselle(draft);

    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;b&gt;Raka &amp; Nadia&lt;/b&gt;');
    expect(html).not.toContain('<b>Raka & Nadia</b>');
  });

  it('renders only resolved proxy gallery images without Storage metadata', () => {
    const imageId = '11111111-1111-4111-8111-111111111111';
    const draft = createDraft();
    draft.content.gallery = { enabled: true, imageIds: [imageId] };

    const html = renderRoselle(draft, [
      { alt: 'Foto pasangan 1', id: imageId, src: `/media/${imageId}` },
    ]);

    expect(html).toContain('Fragmen yang kami simpan');
    expect(html).toContain('data-gallery-layout="single"');
    expect(html).toContain(`src="/media/${imageId}"`);
    expect(html).toContain('alt="Foto pasangan 1"');
    expect(html).not.toContain('storage_path');
    expect(html).not.toContain('projects/');
  });

  it('keeps the renderer free of raw HTML rendering APIs', async () => {
    const testDirectory = path.dirname(fileURLToPath(import.meta.url));
    const sourceFiles = ['../roselle-template.tsx', '../roselle-sections.tsx'] as const;

    for (const sourceFile of sourceFiles) {
      const source = await readFile(path.resolve(testDirectory, sourceFile), 'utf8');
      expect(source).not.toContain(['dangerously', 'SetInnerHTML'].join(''));
    }
  });

  it('selects deterministic visual fixtures for one through four events', () => {
    expect([1, 2, 3, 4].map(getEventLayout)).toEqual(['single', 'pair', 'timeline', 'timeline']);

    for (const count of [1, 2, 3, 4]) {
      const draft = createDraft();
      draft.content.eventSchedule.events = Array.from({ length: count }, (_, index) => ({
        ...draft.content.eventSchedule.events[0]!,
        date: index === count - 1 && count > 2 ? '2027-08-18' : '2027-08-17',
        id: `11111111-1111-4111-8111-${String(index + 1).padStart(12, '0')}`,
        title: `Acara ${index + 1}`,
      }));

      const html = renderRoselle(draft);
      expect(html).toContain(`data-event-count="${count}"`);
      expect(html).toContain(`data-event-layout="${getEventLayout(count)}"`);
      expect(html.match(/data-schedule-event="roselle"/g)).toHaveLength(count);
    }
  });

  it('selects deliberate stable gallery compositions for one, two, three, and four-plus images', () => {
    expect([1, 2, 3, 4, 6].map(getGalleryLayout)).toEqual([
      'single',
      'diptych',
      'triptych',
      'mosaic',
      'mosaic',
    ]);

    for (const count of [1, 2, 3, 5]) {
      const draft = createDraft();
      const images = Array.from({ length: count }, (_, index) => {
        const id = `22222222-2222-4222-8222-${String(index + 1).padStart(12, '0')}`;
        return { alt: `Foto pasangan ${index + 1}`, id, src: `/media/${id}` };
      });
      draft.content.gallery = { enabled: true, imageIds: images.map((image) => image.id) };

      const html = renderRoselle(draft, images);
      expect(html).toContain(`data-gallery-count="${count}"`);
      expect(html).toContain(`data-gallery-layout="${getGalleryLayout(count)}"`);
      expect(html.match(/data-gallery-index=/g)).toHaveLength(count);
    }
  });

  it('composes gift and closing as Roselle chapters without changing saved owner copy', () => {
    const draft = createDraft();
    draft.content.digitalGift = {
      accounts: [
        {
          accountHolder: 'Raka dan Nadia',
          accountNumber: '12345678901234567890',
          id: '33333333-3333-4333-8333-333333333333',
          providerName: 'Bank Seraya',
        },
      ],
      enabled: true,
      heading: 'Tanda kasih',
      lead: 'Doa baik Anda adalah hadiah terindah.',
    };
    draft.content.closing = {
      enabled: true,
      message: 'Sampai berjumpa di hari bahagia kami.',
      signature: 'Raka & Nadia',
    };

    const html = renderRoselle(draft);
    expect(html).toContain('Hadiah &amp; doa');
    expect(html).toContain('Tanda kasih');
    expect(html).toContain('12345678901234567890');
    expect(html).toContain('data-roselle-chapter="gift"');
    expect(html).toContain('data-roselle-chapter="closing"');
    expect(html).toContain('Terima kasih telah menjadi bagian dari hari kami');
    expect(html).toContain('Sampai berjumpa di hari bahagia kami.');
  });

  it('keeps authorized RSVP and Guestbook in one Roselle response chapter on personal surface', () => {
    const invitation = createInvitationViewModel({ draft: createDraft(), project });
    const html = renderToStaticMarkup(
      <RoselleTemplate
        invitation={invitation}
        renderContext={{
          personalSlots: {
            greeting: <p data-fixture="greeting">Halo, Tamu.</p>,
            guestbook: <p data-fixture="guestbook">Ucapan</p>,
            rsvp: <p data-fixture="rsvp">Konfirmasi</p>,
          },
          surface: 'personal',
        }}
      />,
    );

    const greetingIndex = html.indexOf('data-fixture="greeting"');
    const coupleIndex = html.indexOf('data-roselle-chapter="couple"');
    const rsvpIndex = html.indexOf('data-template-response-slot="rsvp"');
    const guestbookIndex = html.indexOf('data-template-response-slot="guestbook"');

    expect(html).toContain('data-surface="personal"');
    expect(html).toContain('Kabar dari Anda');
    expect(greetingIndex).toBeGreaterThan(-1);
    expect(coupleIndex).toBeGreaterThan(greetingIndex);
    expect(rsvpIndex).toBeGreaterThan(coupleIndex);
    expect(guestbookIndex).toBeGreaterThan(rsvpIndex);
    expect(html).not.toContain('data-generic-response-note="roselle"');
  });

  it('loads a local variable display face and declares the mobile opening contract', async () => {
    const testDirectory = path.dirname(fileURLToPath(import.meta.url));
    const css = await readFile(path.resolve(testDirectory, '../roselle.module.css'), 'utf8');

    expect(css).toContain('@fontsource-variable/cormorant-garamond/wght.css');
    expect(css).toContain("'Cormorant Garamond Variable'");
    expect(css).toMatch(/min-height:\s*min\(82svh,/);
    expect(css).toContain("data-gallery-layout='diptych'");
    expect(css).toContain("data-gallery-layout='triptych'");
    expect(css).toContain("data-gallery-layout='mosaic'");
    expect(css).toContain("data-event-layout='timeline'");
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
