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
  InvitationEditorActivePanel,
  invitationEditorDirtyNavigationMessage,
  shouldConfirmInvitationEditorNavigation,
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

const panelKeys = [
  'style',
  'opening',
  'couple',
  'story',
  'schedule',
  'gallery',
  'rsvp',
  'gift',
  'closing',
] as const;

function renderPanel(activeSection: (typeof panelKeys)[number], content = draft.content) {
  return renderToStaticMarkup(
    <InvitationEditorActivePanel
      activeSection={activeSection}
      content={content}
      projectId={project.id}
      updateLocalContent={() => undefined}
    />,
  );
}

describe('SRY-030 invitation editor multi-event owner UI', () => {
  it('renders the guided chapter navigation while mounting only the active chapter', () => {
    const html = renderToStaticMarkup(<InvitationEditor draft={draft} projectId={project.id} />);
    const chapterPairs = [
      ['opening', 'Pembuka'],
      ['couple', 'Mempelai'],
      ['story', 'Cerita kalian'],
      ['schedule', 'Rangkaian Acara'],
      ['rsvp', 'Konfirmasi kehadiran'],
      ['gift', 'Amplop Digital'],
      ['closing', 'Penutup'],
    ] as const;

    for (const [section, heading] of chapterPairs) {
      expect(renderPanel(section)).toContain(`>${heading}</h2>`);
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
    expect(html).toContain('Buka preview tersimpan');
    expect(html).toContain('Preview tersimpan');
    expect(html).toContain('Preview lokal');
    expect(html).toContain('data-local-preview-trigger="true"');
    expect(html).toContain('data-local-preview-desktop="true"');
    expect(html).toContain('data-local-preview-deferred="true"');
    expect(html).toContain('Preview lokal akan segera siap');
    expect(html).toContain('name="editorPayload"');
    expect(html.match(/data-invitation-editor-panel=/g)).toHaveLength(1);
    expect(html).not.toContain('data-surface="preview"');
    expect(html).not.toContain('draft object');
    expect(html).not.toContain('schema field');
    expect(html).not.toContain('JSON payload');
  });

  it('preserves every locked editable form name across lazy-mounted chapters', () => {
    const initialHtml = renderToStaticMarkup(
      <InvitationEditor draft={draft} projectId={project.id} />,
    );
    const allPanelsHtml = panelKeys.map((section) => renderPanel(section)).join('');

    for (const name of editableFieldNames) {
      expect(allPanelsHtml).toContain(`name="${name}"`);
    }

    expect(initialHtml).toContain(`type="hidden" name="projectId" value="${project.id}"`);
    expect(initialHtml).toContain('name="editorPayload"');
    expect(initialHtml).not.toContain('name="hero.title"');
    expect(allPanelsHtml).toContain(
      'Tampilkan bagian ini pada undangan setelah diterbitkan. Isi tetap tersimpan meskipun bagian ini belum ditampilkan.',
    );
    expect(allPanelsHtml).toContain('name="templateKey"');
    expect(allPanelsHtml).toContain('value="roselle"');
    expect(allPanelsHtml).toContain('value="aruna"');
    expect(allPanelsHtml).toContain('value="laras"');
    expect(allPanelsHtml).toContain('>Terpilih</span>');
    expect(allPanelsHtml).toContain('name="story.body"');
    expect(allPanelsHtml).toContain('Rangkaian Acara');
    expect(allPanelsHtml).toContain(
      'Tambahkan akad, resepsi, atau acara lain dalam satu undangan.',
    );
    expect(allPanelsHtml).toContain('Acara utama');
    expect(allPanelsHtml).toContain(
      'Acara pertama menjadi acara utama yang digunakan pada ringkasan undangan.',
    );
    expect(allPanelsHtml).toContain('Tambah acara');
    expect(allPanelsHtml).toContain(
      'placeholder="Contoh: Akad Nikah, Resepsi, atau Ngunduh Mantu"',
    );
    expect(allPanelsHtml).toContain('aria-label="Pindahkan acara 1 ke bawah"');
    expect(allPanelsHtml).toContain('aria-label="Hapus acara 1"');
    expect(allPanelsHtml).toContain('name="eventSchedule.events.0.mapsUrl"');
    expect(allPanelsHtml).toContain('name="closing.message"');
    expect(allPanelsHtml).not.toContain('name="gallery.imageIds"');
    expect(allPanelsHtml).not.toContain('Upload foto');
    expect(initialHtml).not.toContain('draft-private-id');
  });

  it('keeps at least one schedule event in the editor by disabling the final remove control', () => {
    const html = renderPanel('schedule');

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
              accountHolder: 'Synthetic Test Couple',
              accountNumber: 'TEST-ACCOUNT-0001',
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

    const html = renderPanel('gift', giftDraft.content);

    expect(html).toContain('Penyedia / Bank / E-wallet');
    expect(html).toContain('Nama pemilik rekening');
    expect(html).toContain('Nomor rekening / nomor e-wallet');
    expect(html).toContain('name="digitalGift.accounts.0.id"');
    expect(html).toContain('name="digitalGift.accounts.0.providerName"');
    expect(html).toContain('name="digitalGift.accounts.0.accountHolder"');
    expect(html).toContain('name="digitalGift.accounts.0.accountNumber"');
    expect(html).toContain('Tambah rekening');
    expect(html).toContain('Hapus rekening');
    expect(html).toContain('value="TEST-ACCOUNT-0001"');
  });

  it('defers the local preview while keeping the authoritative saved preview distinct', async () => {
    const html = renderToStaticMarkup(<InvitationEditor draft={draft} projectId={project.id} />);
    const previewSource = await readFile(
      path.resolve(process.cwd(), 'src/components/projects/invitation-editor-live-preview.tsx'),
      'utf8',
    );

    expect(html).toContain('data-testid="invitation-editor-save-status"');
    expect(html).toContain('Belum ada perubahan');
    expect(html).not.toContain('>Tersimpan</p>');
    expect(html).toContain('Preview tersimpan tetap mengikuti draft dari server.');
    expect(html).toContain('Preview lokal akan segera siap');
    expect(html).not.toContain('data-surface="preview"');
    expect(previewSource).toContain('Mengikuti perubahan lokal. Belum dipublikasikan dari sini.');
    expect(previewSource).toContain('surface="preview"');
    expect(previewSource).toContain('memo(function InvitationEditorLivePreview');
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
      description: 'Perubahan sudah tersimpan dan siap diperiksa di preview tersimpan.',
      label: 'Tersimpan',
    });
  });

  it('requires confirmation only when dirty navigation leaves the current editor document', () => {
    const current = `https://seraya.test/dashboard/${project.id}/invitation#bagian-opening`;

    expect(
      shouldConfirmInvitationEditorNavigation(
        current,
        `https://seraya.test/dashboard/${project.id}/invitation#bagian-couple`,
      ),
    ).toBe(false);
    expect(
      shouldConfirmInvitationEditorNavigation(
        current,
        `https://seraya.test/dashboard/${project.id}/preview`,
      ),
    ).toBe(true);
    expect(invitationEditorDirtyNavigationMessage).toContain('belum disimpan');
  });

  it('keeps the server action, accessible field-error boundary, and editor-local mobile action treatment', async () => {
    const [source, fieldSource, previewSource] = await Promise.all([
      readFile(
        path.resolve(process.cwd(), 'src/components/projects/invitation-editor.tsx'),
        'utf8',
      ),
      readFile(
        path.resolve(process.cwd(), 'src/components/projects/invitation-editor-fields.tsx'),
        'utf8',
      ),
      readFile(
        path.resolve(process.cwd(), 'src/components/projects/invitation-editor-live-preview.tsx'),
        'utf8',
      ),
    ]);

    expect(source).toContain(
      "import { saveInvitationEditorAction } from '@/modules/invitations/invitation-editor.actions';",
    );
    expect(source).toMatch(/<form\s+action=\{formAction\}/);
    expect(source).toContain('invitationEditorLocalContentReducer');
    expect(fieldSource).toContain("value={value ?? ''}");
    expect(fieldSource).toContain('onValueChange(event.currentTarget.value)');
    expect(source).toContain('role="alert"');
    expect(fieldSource).toContain('aria-describedby');
    expect(fieldSource).toContain('role="alert"');
    expect(source).toContain('sticky bottom-0');
    expect(source).toContain('safe-area-inset-bottom');
    expect(source).toContain('data-local-preview-trigger');
    expect(source).toContain('DeferredInvitationEditorLivePreview');
    expect(source).toContain('dynamic(');
    expect(source).toContain('ssr: false');
    expect(source).toContain('name="editorPayload"');
    expect(source).toContain('requestIdleCallback');
    expect(source).toContain('invitation_editor_interactive_ready');
    expect(previewSource).toContain('surface="preview"');
    expect(previewSource).toContain('memo(function InvitationEditorLivePreview');
    expect(previewSource).not.toContain('fetch(');
    expect(previewSource).not.toContain('/g/');
    expect(previewSource).not.toContain('personalSlots');
    expect(source).not.toContain('localStorage');
    expect(source).not.toContain('sessionStorage');
    expect(source).not.toContain('revalidateTag');
    expect(source).not.toContain('published_invitation_snapshots');
  });
});
