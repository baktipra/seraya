import { parseInvitationStudioMode } from '../../../../../src/components/projects/invitation-studio.types';
import {
  parseInvitationStudioPreviewSurface,
  parseInvitationStudioPreviewVersion,
  parseInvitationStudioPreviewViewport,
} from '../../../../../src/components/projects/invitation-studio-preview.types';
import { createDefaultInvitationDraftContent } from '../../../../../src/modules/invitations/invitation-draft.defaults';
import type { InvitationDraft } from '../../../../../src/modules/invitations/invitation-draft.types';
import type { PublishedInvitationSnapshot } from '../../../../../src/modules/publications/publication.types';

import { InvitationStudioSliceEFixture } from './fixture-client';

type FixtureSearchParams = {
  mode?: string | string[];
  published?: string | string[];
  surface?: string | string[];
  version?: string | string[];
  viewport?: string | string[];
};

function getSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function InvitationStudioSliceEFixturePage({
  searchParams,
}: {
  searchParams?: Promise<FixtureSearchParams>;
}) {
  const query = await (searchParams ?? Promise.resolve<FixtureSearchParams>({}));
  const hasPublishedVersion = getSearchParam(query.published) !== '0';
  const content = createDefaultInvitationDraftContent({
    default_timezone: 'Asia/Jakarta',
    event_date_primary: '2027-06-12',
    person_one_name: 'Nadia',
    person_two_name: 'Raka',
  });
  const savedDraft: InvitationDraft = {
    content: {
      ...content,
      hero: { ...content.hero, title: 'Draf tersimpan Nadia & Raka' },
    },
    created_at: '2026-08-06T00:00:00.000Z',
    deleted_at: null,
    id: 'slice-e-draft',
    project_id: 'slice-e-project',
    schema_version: 1,
    updated_at: '2026-08-06T05:00:00.000Z',
  };
  const publishedSnapshot: PublishedInvitationSnapshot | null = hasPublishedVersion
    ? {
        created_at: '2026-08-05T00:00:00.000Z',
        draft_schema_version: 1,
        id: 'slice-e-publication',
        is_current: true,
        project_id: 'slice-e-project',
        published_at: '2026-08-05T05:00:00.000Z',
        revision: 3,
        slug: 'nadia-raka',
        snapshot: {
          draft: {
            ...savedDraft.content,
            hero: { ...savedDraft.content.hero, title: 'Versi terbit Nadia & Raka' },
          },
          project: {
            eventCity: 'Bandung',
            eventDatePrimary: '2027-06-12',
            slug: 'nadia-raka',
            timezone: 'Asia/Jakarta',
          },
        },
        template_id: savedDraft.content.templateKey,
      }
    : null;

  return (
    <main className="bg-seraya-canvas min-h-screen px-0 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-[96rem]">
        <InvitationStudioSliceEFixture
          initialMode={parseInvitationStudioMode(query.mode ?? 'preview')}
          initialSurface={parseInvitationStudioPreviewSurface(query.surface)}
          initialVersion={parseInvitationStudioPreviewVersion(
            query.version,
            Boolean(publishedSnapshot),
          )}
          initialViewport={parseInvitationStudioPreviewViewport(query.viewport)}
          publishedSnapshot={publishedSnapshot}
          savedDraft={savedDraft}
        />
      </div>
    </main>
  );
}
