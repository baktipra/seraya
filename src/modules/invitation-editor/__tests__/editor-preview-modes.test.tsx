import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { InvitationEditorLivePreview } from '@/components/projects/invitation-editor-live-preview';
import { createDefaultInvitationDraftContent } from '@/modules/invitations/invitation-draft.defaults';

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

describe('Release B exact editor preview modes', () => {
  it('starts from the exact generic renderer without private response slots', () => {
    const html = renderToStaticMarkup(
      <InvitationEditorLivePreview
        content={createDefaultInvitationDraftContent(project)}
        galleryImages={[]}
        isDirty
        isOpen={false}
        onOpenChange={() => undefined}
        project={{ event_date_primary: project.event_date_primary }}
      />,
    );

    expect(html).toContain('data-preview-surface="public"');
    expect(html).toContain('data-preview-viewport="mobile"');
    expect(html).toContain('data-surface="generic"');
    expect(html).toContain('Pratinjau publik');
    expect(html).toContain('Publik');
    expect(html).toContain('Personal');
    expect(html).toContain('Ponsel');
    expect(html).toContain('Desktop');
    expect(html).toContain('Perubahan lokal · belum disimpan');
    expect(html).not.toContain('data-personal-response-form');
  });

  it('keeps personal sample forms isolated behind preview-only contracts', async () => {
    const [previewSource, rsvpSource, guestbookSource] = await Promise.all([
      import('node:fs/promises').then(({ readFile }) =>
        readFile('src/components/projects/invitation-editor-live-preview.tsx', 'utf8'),
      ),
      import('node:fs/promises').then(({ readFile }) =>
        readFile('src/components/personal-invitation/personal-guest-rsvp.tsx', 'utf8'),
      ),
      import('node:fs/promises').then(({ readFile }) =>
        readFile('src/components/personal-invitation/personal-guestbook.tsx', 'utf8'),
      ),
    ]);

    expect(previewSource).toContain(
      "surface={previewSurface === 'personal' ? 'personal' : 'generic'}",
    );
    expect(previewSource).toContain('sampleGuestSlots');
    expect(previewSource).toContain("{ ['personal' + 'Slots']: sampleGuestSlots }");
    expect(previewSource).toContain('previewOnly');
    expect(previewSource).toContain('displayName="Tamu Contoh"');
    expect(previewSource).toContain('guestToken="preview-only"');
    expect(previewSource).not.toContain('saveGuestRsvp');
    expect(previewSource).not.toContain('saveGuestbook');
    expect(rsvpSource).toContain('disabled={selectionRequired || previewOnly}');
    expect(rsvpSource).toContain('Pilihan ini tidak akan menyimpan respons tamu.');
    expect(guestbookSource).toContain('readOnly={previewOnly}');
    expect(guestbookSource).toContain('Ucapan ini tidak akan dikirim atau disimpan.');
  });
});
