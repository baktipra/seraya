import { parseInvitationStudioMode } from '../../../../../src/components/projects/invitation-studio.types';
import { createDefaultInvitationDraftContent } from '../../../../../src/modules/invitations/invitation-draft.defaults';
import type { InvitationDraft } from '../../../../../src/modules/invitations/invitation-draft.types';

import { InvitationStudioSliceCFixture } from './fixture-client';

export default async function InvitationStudioSliceCFixturePage({
  searchParams,
}: {
  searchParams?: Promise<{ mode?: string | string[] }>;
}) {
  const query = await (searchParams ?? Promise.resolve<{ mode?: string | string[] }>({}));
  const initialDraft: InvitationDraft = {
    content: createDefaultInvitationDraftContent({
      default_timezone: 'Asia/Jakarta',
      event_date_primary: '2027-06-12',
      person_one_name: 'Nadia',
      person_two_name: 'Raka',
    }),
    created_at: '2026-08-06T00:00:00.000Z',
    deleted_at: null,
    id: 'slice-c-draft',
    project_id: 'slice-c-project',
    schema_version: 1,
    updated_at: '2026-08-06T00:00:00.000Z',
  };

  return (
    <main className="bg-seraya-canvas min-h-screen px-0 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-[96rem]">
        <InvitationStudioSliceCFixture
          initialDraft={initialDraft}
          initialMode={parseInvitationStudioMode(query.mode ?? 'design')}
        />
      </div>
    </main>
  );
}
