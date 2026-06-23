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

import { InvitationEditor } from '@/components/projects/invitation-editor';

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

describe('SRY-016 invitation editor owner UI', () => {
  it('renders the scoped editor sections, save action, and private preview entry without gallery controls', () => {
    const html = renderToStaticMarkup(<InvitationEditor draft={draft} projectId={project.id} />);

    expect(html).toContain('Edit undangan');
    expect(html).toContain('Pembuka');
    expect(html).toContain('Mempelai');
    expect(html).toContain('Cerita');
    expect(html).toContain('Acara');
    expect(html).toContain('Lokasi');
    expect(html).toContain('RSVP');
    expect(html).toContain('Penutup');
    expect(html).toContain('Simpan perubahan');
    expect(html).toContain('Pratinjau undangan');
    expect(html).toContain(`href="/dashboard/${project.id}/preview"`);
    expect(html).toContain('name="hero.title"');
    expect(html).toContain('name="rsvp.enabled"');
    expect(html).not.toContain('name="gallery.imageIds"');
    expect(html).not.toContain('Upload foto');
    expect(html).not.toContain('draft-private-id');
  });
});
