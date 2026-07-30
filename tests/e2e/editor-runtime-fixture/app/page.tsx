import { InvitationEditor } from '@/components/projects/invitation-editor';
import { createDefaultInvitationDraftContent } from '@/modules/invitations/invitation-draft.defaults';
import type { InvitationDraft } from '@/modules/invitations/invitation-draft.types';

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
  status: 'draft' as const,
};

const content = createDefaultInvitationDraftContent(project);
content.templateKey = 'roselle';
content.hero.title = 'Raka & Nadia';
content.hero.subtitle = 'Dengan penuh syukur kami mengundang Anda.';

const draft: InvitationDraft = {
  content,
  created_at: '2026-06-20T00:00:00.000Z',
  deleted_at: null,
  id: 'draft-private-id',
  project_id: project.id,
  schema_version: 1,
  updated_at: '2026-06-20T00:00:00.000Z',
};

export default function EditorRuntimeFixturePage() {
  return (
    <main className="mx-auto min-h-screen max-w-[96rem] px-4 py-6 sm:px-6">
      <InvitationEditor
        draft={draft}
        galleryImages={[]}
        project={{ event_date_primary: project.event_date_primary }}
        projectId={project.id}
      />
    </main>
  );
}
