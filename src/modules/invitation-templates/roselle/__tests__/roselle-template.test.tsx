import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { createDefaultInvitationDraftContent } from '@/modules/invitations/invitation-draft.defaults';
import type { InvitationDraft } from '@/modules/invitations/invitation-draft.types';

import { createInvitationViewModel } from '../../invitation-view-model';
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
    <RoselleTemplate invitation={createInvitationViewModel({ draft, galleryImages, project })} />,
  );
}

describe('RoselleTemplate', () => {
  it('renders the default draft as a real invitation while omitting empty optional sections', () => {
    const html = renderRoselle();

    expect(html).toContain('<article');
    expect(html).toContain('The Wedding Of');
    expect(html).toContain('Raka &amp; Nadia');
    expect(html).toContain('17 Agustus 2027');
    expect(html).toContain('Dengan penuh cinta');
    expect(html).toContain('Konfirmasi kehadiran akan segera tersedia.');
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
    expect(html).toContain('Buka peta acara (tab baru)');
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

    expect(html).toContain('Potret kami');
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
});
