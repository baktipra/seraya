import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { InvitationTemplatePicker } from '@/components/projects/invitation-editor-fields';
import {
  getInvitationEditorSaveStatus,
  InvitationEditor,
  InvitationEditorActivePanel,
  invitationEditorDirtyNavigationMessage,
  shouldConfirmInvitationEditorNavigation,
} from '@/components/projects/invitation-editor';
import { InvitationStudioProvider } from '@/components/projects/invitation-studio-provider';
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

vi.mock('@/modules/invitations/invitation-editor.actions', () => ({
  saveInvitationEditorAction: vi.fn(async (previousState) => previousState),
}));

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

const editableContentFieldNames = [
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

const contentPanelKeys = [
  'opening',
  'couple',
  'story',
  'schedule',
  'gallery',
  'rsvp',
  'gift',
  'closing',
] as const;

function renderPanel(activeSection: (typeof contentPanelKeys)[number], content = draft.content) {
  return renderToStaticMarkup(
    <InvitationEditorActivePanel
      activeSection={activeSection}
      content={content}
      projectId={project.id}
      updateLocalContent={() => undefined}
    />,
  );
}

function renderEditor() {
  return renderToStaticMarkup(
    <InvitationStudioProvider
      initialDraft={draft}
      projectId={project.id}
      refreshOnSuccess={false}
    >
      <InvitationEditor draft={draft} projectId={project.id} />
    </InvitationStudioProvider>,
  );
}

function renderDesignPicker() {
  return renderToStaticMarkup(
    <InvitationTemplatePicker
      onPaletteSelect={() => undefined}
      onSelect={() => undefined}
      selectedPaletteKey={draft.content.paletteKey}
      selectedTemplateKey={draft.content.templateKey}
    />,
  );
}

describe('SRY-030 invitation editor multi-event owner UI', () => {
  it('renders the guided content chapter navigation while mounting only the active chapter', () => {
    const html = renderEditor();
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
    expect(html).toContain('Lengkapi detail');
    expect(html).toContain('Simpan perubahan');
    expect(html).toContain('Preview tersimpan');
    expect(html).toContain('Preview exact tersedia di mode Desain');
    expect(html).toContain('name="editorPayload"');
    expect(html).toContain('Bagian 1 dari 8');
    expect(html.match(/data-invitation-editor-panel=/g)).toHaveLength(1);
    expect(html).not.toContain('Pilih desain undangan');
    expect(html).not.toContain('data-surface="preview"');
    expect(html).not.toContain('draft object');
    expect(html).not.toContain('schema field');
    expect(html).not.toContain('JSON payload');
  });

  it('preserves every locked editable field across lazy content chapters and dedicated design controls', () => {
    const initialHtml = renderEditor();
    const allPanelsHtml = contentPanelKeys.map((section) => renderPanel(section)).join('');
    const designHtml = renderDesignPicker();

    for (const name of editableContentFieldNames) {
      expect(allPanelsHtml).toContain(`name="${name}"`);
    }

    expect(initialHtml).toContain('name="projectId"');
    expect(initialHtml).toContain(`value="${project.id}"`);
    expect(initialHtml).toContain('name="editorPayload"');
    expect(initialHtml).toContain('name="hero.title"');
    expect(allPanelsHtml).toContain(
      'Tampilkan bagian ini pada undangan setelah diterbitkan. Isi tetap tersimpan meskipun bagian ini belum ditampilkan.',
    );
    expect(designHtml).toContain('name="templateKey"');
    expect(designHtml).toContain('name="paletteKey"');
    expect(designHtml).toContain('value="roselle"');
    expect(designHtml).toContain('value="aruna"');
    expect(designHtml).toContain('value="laras"');
    expect(designHtml).toContain('>Terpilih</span>');
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

  it('keeps the saved preview handoff distinct from the buffered V1 editorial preview', async () => {
    const html = renderEditor();
    const previewRailSource = await readFile(
      path.resolve(process.cwd(), 'src/components/projects/invitation-studio-preview-rail.tsx'),
      'utf8',
    );

    expect(html).toContain('data-testid="invitation-editor-save-status"');
    expect(html).toContain('Belum ada perubahan');
    expect(html).not.toContain('>Tersimpan</p>');
    expect(html).toContain('Preview exact tersedia di mode Desain');
    expect(html).not.toContain('data-surface="preview"');
    expect(html).toContain(`href="/dashboard/${project.id}/preview"`);
    expect(previewRailSource).toContain('useDeferredValue(localContent)');
    expect(previewRailSource).toContain("import('@/modules/invitation-templates')");
    expect(previewRailSource).toContain('ssr: false');
    expect(previewRailSource).toContain('requestIdleCallback');
    expect(previewRailSource).toContain('surface="generic"');
    expect(previewRailSource).not.toContain('fetch(');
    expect(previewRailSource).not.toContain('personalSlots');
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

  it('keeps save authority in the provider and runtime preview authority in the V1 rail', async () => {
    const [source, providerSource, taskWorkspaceSource, fieldSource, previewRailSource] =
      await Promise.all([
        readFile(
          path.resolve(process.cwd(), 'src/components/projects/invitation-editor.tsx'),
          'utf8',
        ),
        readFile(
          path.resolve(process.cwd(), 'src/components/projects/invitation-studio-provider.tsx'),
          'utf8',
        ),
        readFile(
          path.resolve(process.cwd(), 'src/components/projects/invitation-task-workspace.tsx'),
          'utf8',
        ),
        readFile(
          path.resolve(process.cwd(), 'src/components/projects/invitation-editor-fields.tsx'),
          'utf8',
        ),
        readFile(
          path.resolve(process.cwd(), 'src/components/projects/invitation-studio-preview-rail.tsx'),
          'utf8',
        ),
      ]);

    expect(providerSource).toContain(
      "import { saveInvitationEditorAction } from '@/modules/invitations/invitation-editor.actions';",
    );
    expect(providerSource).toContain('invitationEditorLocalContentReducer');
    expect(source).toMatch(/<form\s+action=\{formAction\}/);
    expect(taskWorkspaceSource).toContain('StudioSaveFormBridge');
    expect(taskWorkspaceSource).toContain('name="editorPayload"');
    expect(fieldSource).toContain("value={value ?? ''}");
    expect(fieldSource).toContain('onValueChange(event.currentTarget.value)');
    expect(source).toContain('role="alert"');
    expect(fieldSource).toContain('aria-describedby');
    expect(fieldSource).toContain('role="alert"');
    expect(taskWorkspaceSource).toContain('data-invitation-task-save-action');
    expect(previewRailSource).toContain("import('@/modules/invitation-templates')");
    expect(previewRailSource).toContain('useDeferredValue(localContent)');
    expect(previewRailSource).toContain('requestIdleCallback');
    expect(previewRailSource).toContain('invitation_editor_interactive_ready');
    expect(previewRailSource).toContain('data-invitation-editor-runtime-ready');
    expect(previewRailSource).not.toContain('fetch(');
    expect(previewRailSource).not.toContain('/g/');
    expect(previewRailSource).not.toContain('personalSlots');
    expect(providerSource).not.toContain('localStorage');
    expect(providerSource).not.toContain('sessionStorage');
    expect(taskWorkspaceSource).not.toContain('revalidateTag');
    expect(taskWorkspaceSource).not.toContain('published_invitation_snapshots');
  });
});
