import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultInvitationDraftContent } from '@/modules/invitations/invitation-draft.defaults';
import { ProjectAccessDeniedError } from '@/modules/projects/project.policy';

const { getEditorMock, notFoundMock } = vi.hoisted(() => ({
  getEditorMock: vi.fn(),
  notFoundMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({ notFound: notFoundMock }));
vi.mock('@/components/projects/invitation-editor', () => ({
  InvitationEditor: ({ projectId }: { projectId: string }) => (
    <div data-editor-project-id={projectId}>Edit undangan</div>
  ),
}));
vi.mock('@/modules/invitations/invitation-editor.service', () => ({
  InvitationEditorDraftUnavailableError: class InvitationEditorDraftUnavailableError extends Error {},
  getInvitationEditorForCurrentUser: getEditorMock,
}));

import InvitationEditorPage, {
  dynamic,
  fetchCache,
  revalidate,
} from '@/app/(dashboard)/dashboard/[projectId]/invitation/page';
import { InvitationEditorDraftUnavailableError } from '@/modules/invitations/invitation-editor.service';

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

describe('SRY-016 private invitation editor route', () => {
  beforeEach(() => {
    getEditorMock.mockReset();
    notFoundMock.mockReset();
    notFoundMock.mockImplementation(() => {
      throw new Error('NEXT_NOT_FOUND');
    });
  });

  it('is private dynamic no-store and renders only the verified owner editor payload', async () => {
    getEditorMock.mockResolvedValue({ draft, project });

    const page = await InvitationEditorPage({ params: Promise.resolve({ projectId: project.id }) });
    const html = renderToStaticMarkup(page);

    expect(dynamic).toBe('force-dynamic');
    expect(revalidate).toBe(0);
    expect(fetchCache).toBe('force-no-store');
    expect(getEditorMock).toHaveBeenCalledWith(project.id);
    expect(html).toContain('Edit undangan');
    expect(html).toContain(`data-editor-project-id="${project.id}"`);
    expect(html).not.toContain('draft-private-id');
    expect(html).not.toContain(project.account_id);
  });

  it('uses the same unavailable route for cross-owner and unavailable draft cases', async () => {
    getEditorMock.mockRejectedValueOnce(new ProjectAccessDeniedError());

    await expect(
      InvitationEditorPage({
        params: Promise.resolve({ projectId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' }),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND');

    getEditorMock.mockRejectedValueOnce(new InvitationEditorDraftUnavailableError());

    await expect(
      InvitationEditorPage({ params: Promise.resolve({ projectId: project.id }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('does not introduce a public snapshot, cookie, or Host-derived route dependency', async () => {
    const source = await readFile(
      path.resolve(process.cwd(), 'src/app/(dashboard)/dashboard/[projectId]/invitation/page.tsx'),
      'utf8',
    );

    expect(source).toContain('getInvitationEditorForCurrentUser');
    expect(source).not.toContain('createServerSupabaseClient');
    expect(source).not.toContain('cookies(');
    expect(source).not.toContain('publications');
    expect(source).not.toContain('headers(');
  });
});
