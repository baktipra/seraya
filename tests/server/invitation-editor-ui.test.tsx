import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { createDefaultInvitationDraftContent } from '@/modules/invitations/invitation-draft.defaults';

const { refreshMock, toastMock } = vi.hoisted(() => ({
  refreshMock: vi.fn(),
  toastMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock('@/design-system', async () => {
  const actual = await vi.importActual<typeof import('@/design-system')>('@/design-system');

  return {
    ...actual,
    useToast: () => ({ toast: toastMock }),
  };
});

import {
  getInvitationEditorSaveStatus,
  InvitationEditor,
} from '@/components/projects/invitation-editor';

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

const draft = {
  content: createDefaultInvitationDraftContent(project),
  created_at: '2026-06-20T00:00:00.000Z',
  deleted_at: null,
  id: 'draft-private-id',
  project_id: project.id,
  schema_version: 1,
  updated_at: '2026-06-20T00:00:00.000Z',
};

const editableFieldNames = [
  'templateKey',
  'hero.eyebrow',
  'hero.title',
  'hero.subtitle',
  'couple.personOne.displayName',
  'couple.personOne.fullName',
  'couple.personOne.parentLine',
  'couple.personTwo.displayName',
  'couple.personTwo.fullName',
  'couple.personTwo.parentLine',
  'story.enabled',
  'story.heading',
  'story.body',
  'eventSchedule.events.0.id',
  'eventSchedule.events.0.title',
  'eventSchedule.events.0.date',
  'eventSchedule.events.0.startTime',
  'eventSchedule.events.0.endTime',
  'eventSchedule.events.0.venueName',
  'eventSchedule.events.0.venueAddress',
  'eventSchedule.events.0.mapsUrl',
  'rsvp.enabled',
  'rsvp.heading',
  'rsvp.lead',
  'digitalGift.enabled',
  'digitalGift.heading',
  'digitalGift.lead',
  'closing.enabled',
  'closing.message',
  'closing.signature',
] as const;

const polishedSections = [
  'Pembuka',
  'Mempelai',
  'Cerita kalian',
  'Rangkaian Acara',
  'Konfirmasi kehadiran',
  'Amplop Digital',
  'Penutup',
] as const;

describe('SRY-030 invitation editor multi-event owner UI', () => {
  it('renders the seven guided editing chapters in the required order with owner-friendly copy', () => {
    const html = renderToStaticMarkup(<InvitationEditor draft={draft} projectId={project.id} />);

    let previousIndex = -1;

    for (const section of polishedSections) {
      const sectionIndex = html.indexOf(`>${section}</h2>`);
      expect(sectionIndex).toBeGreaterThan(previousIndex);
      previousIndex = sectionIndex;
    }

    expect(html).toContain(
      'Undangan belum dipublikasikan. Perubahan Anda hanya terlihat di preview pribadi sampai undangan diterbitkan.',
    );
    expect(html).toContain('Belum dipublikasikan');
    expect(html).toContain('Undangan belum dipublikasikan.');
    expect(html).toContain(
      '1</span><span class="text-seraya-text-primary text-sm font-semibold">Lengkapi detail</span>',
    );
    expect(html).toContain('Simpan perubahan');
    expect(html).toContain('Pilih desain undangan');
    expect(html).toContain('Pilih tampilan yang paling sesuai untuk hari spesial kalian.');
    expect(html).toContain('Roselle');
    expect(html).toContain('Aruna');
    expect(html).toContain('Laras');
    expect(html).toContain('Lihat hasil undangan');
    expect(html).toContain('Preview undangan');
    expect(html).toContain('Sapaan kecil');
    expect(html).toContain('Nama yang tampil di undangan');
    expect(html).toContain('Tampilkan konfirmasi kehadiran');
    expect(html).toContain(
      'Bagikan informasi rekening atau e-wallet untuk hadiah pernikahan. Informasi ini akan tampil pada undangan setelah dipublikasikan.',
    );
    expect(html).toContain('Tampilkan Amplop Digital');
    expect(html).toContain('Nomor hanya akan ditampilkan setelah undangan dipublikasikan.');
    expect(html).toContain('Nama penutup');
    expect(html).not.toContain('Isi undangan Roselle');
    expect(html).not.toContain('draft object');
    expect(html).not.toContain('schema field');
    expect(html).not.toContain('JSON payload');
  });

  it('preserves every locked editable form name and keeps optional-section inputs rendered', () => {
    const html = renderToStaticMarkup(<InvitationEditor draft={draft} projectId={project.id} />);

    for (const name of editableFieldNames) {
      expect(html).toContain(`name="${name}"`);
    }

    expect(html).toContain(`type="hidden" name="projectId" value="${project.id}"`);
    expect(html).toContain(
      'Tampilkan bagian ini pada undangan setelah diterbitkan. Isi tetap tersimpan meskipun bagian ini belum ditampilkan.',
    );
    expect(html).toContain('name="templateKey"');
    expect(html).toContain('value="roselle"');
    expect(html).toContain('value="aruna"');
    expect(html).toContain('value="laras"');
    expect(html).toContain('>Terpilih</span>');
    expect(html).toContain('name="story.body"');
    expect(html).toContain('Rangkaian Acara');
    expect(html).toContain('Tambahkan akad, resepsi, atau acara lain dalam satu undangan.');
    expect(html).toContain('Acara utama');
    expect(html).toContain(
      'Acara pertama menjadi acara utama yang digunakan pada ringkasan undangan.',
    );
    expect(html).toContain('Tambah acara');
    expect(html).toContain('placeholder="Contoh: Akad Nikah, Resepsi, atau Ngunduh Mantu"');
    expect(html).toContain('aria-label="Pindahkan acara 1 ke bawah"');
    expect(html).toContain('aria-label="Hapus acara 1"');
    expect(html).toContain('name="eventSchedule.events.0.mapsUrl"');
    expect(html).toContain('name="closing.message"');
    expect(html).not.toContain('name="gallery.imageIds"');
    expect(html).not.toContain('Upload foto');
    expect(html).not.toContain('draft-private-id');
  });

  it('keeps at least one schedule event in the editor by disabling the final remove control', () => {
    const html = renderToStaticMarkup(<InvitationEditor draft={draft} projectId={project.id} />);

    expect(html).toContain('aria-label="Hapus acara 1"');
    expect(html).toMatch(
      /aria-label="Hapus acara 1"[^>]*disabled|disabled[^>]*aria-label="Hapus acara 1"/,
    );
    expect(html).not.toContain('name="events.primaryDate"');
    expect(html).not.toContain('name="location.mapsUrl"');
  });

  it('renders owner-only Amplop Digital account fields when the current private draft has accounts', () => {
    const giftDraft = {
      ...draft,
      content: {
        ...draft.content,
        digitalGift: {
          accounts: [
            {
              accountHolder: 'Raka Pratama',
              accountNumber: '123456789012',
              id: '11111111-1111-4111-8111-111111111111',
              providerName: 'Bank Seraya',
            },
          ],
          enabled: true,
          heading: 'Amplop untuk kami',
          lead: 'Terima kasih atas doa terbaik Anda.',
        },
      },
    };

    const html = renderToStaticMarkup(
      <InvitationEditor draft={giftDraft} projectId={project.id} />,
    );

    expect(html).toContain('Penyedia / Bank / E-wallet');
    expect(html).toContain('Nama pemilik rekening');
    expect(html).toContain('Nomor rekening / nomor e-wallet');
    expect(html).toContain('name="digitalGift.accounts.0.id"');
    expect(html).toContain('name="digitalGift.accounts.0.providerName"');
    expect(html).toContain('name="digitalGift.accounts.0.accountHolder"');
    expect(html).toContain('name="digitalGift.accounts.0.accountNumber"');
    expect(html).toContain('Tambah rekening');
    expect(html).toContain('Hapus rekening');
    expect(html).toContain('value="123456789012"');
  });

  it('shows an initial truthful save status and explains that preview uses saved draft changes only', () => {
    const html = renderToStaticMarkup(<InvitationEditor draft={draft} projectId={project.id} />);

    expect(html).toContain('data-testid="invitation-editor-save-status"');
    expect(html).toContain('Belum ada perubahan');
    expect(html).not.toContain('>Tersimpan</p>');
    expect(html).toContain('Preview menampilkan perubahan yang sudah disimpan.');
    expect(html).toContain(`href="/dashboard/${project.id}/preview"`);
  });

  it('uses local save status only after explicit state transitions and never treats unsaved edits as saved', () => {
    expect(
      getInvitationEditorSaveStatus({
        actionStatus: 'idle',
        hasSaved: false,
        isDirty: false,
        isPending: false,
      }),
    ).toMatchObject({ label: 'Belum ada perubahan' });

    expect(
      getInvitationEditorSaveStatus({
        actionStatus: 'idle',
        hasSaved: false,
        isDirty: true,
        isPending: false,
      }),
    ).toMatchObject({ label: 'Belum disimpan' });

    expect(
      getInvitationEditorSaveStatus({
        actionStatus: 'idle',
        hasSaved: false,
        isDirty: true,
        isPending: true,
      }),
    ).toMatchObject({ label: 'Menyimpan perubahan…' });

    expect(
      getInvitationEditorSaveStatus({
        actionStatus: 'error',
        hasSaved: false,
        isDirty: true,
        isPending: false,
      }),
    ).toMatchObject({ label: 'Belum disimpan' });

    expect(
      getInvitationEditorSaveStatus({
        actionStatus: 'success',
        hasSaved: false,
        isDirty: false,
        isPending: false,
      }),
    ).toMatchObject({ label: 'Belum ada perubahan' });

    expect(
      getInvitationEditorSaveStatus({
        actionStatus: 'success',
        hasSaved: true,
        isDirty: false,
        isPending: false,
      }),
    ).toMatchObject({
      description: 'Perubahan siap dipreview.',
      label: 'Tersimpan',
    });
  });

  it('keeps the server action, accessible field-error boundary, and editor-local mobile action treatment', async () => {
    const source = await readFile(
      path.resolve(process.cwd(), 'src/components/projects/invitation-editor.tsx'),
      'utf8',
    );

    expect(source).toContain(
      "import { saveInvitationEditorAction } from '@/modules/invitations/invitation-editor.actions';",
    );
    expect(source).toMatch(/<form\s+action=\{formAction\}/);
    expect(source).toContain('onChange={() => setIsDirty(true)}');
    expect(source).toContain('role="alert"');
    expect(source).toContain('aria-describedby');
    expect(source).toContain('sticky bottom-0');
    expect(source).toContain('safe-area-inset-bottom');
    expect(source).not.toContain('localStorage');
    expect(source).not.toContain('sessionStorage');
    expect(source).not.toContain('revalidateTag');
    expect(source).not.toContain('published_invitation_snapshots');
  });
});
