import { parseInvitationStudioMode } from '../../../../../src/components/projects/invitation-studio.types';
import { createDefaultInvitationDraftContent } from '../../../../../src/modules/invitations/invitation-draft.defaults';
import type { InvitationDraft } from '../../../../../src/modules/invitations/invitation-draft.types';
import type { InvitationAudioSummary } from '../../../../../src/modules/media/invitation-audio.types';
import type { InvitationGalleryImage } from '../../../../../src/modules/media/media.types';

import { InvitationStudioSliceDFixture } from './fixture-client';

const projectId = '44444444-4444-4444-8444-444444444444';
const firstImageId = '11111111-1111-4111-8111-111111111111';
const secondImageId = '22222222-2222-4222-8222-222222222222';
const audioId = '33333333-3333-4333-8333-333333333333';
const imagePlaceholder =
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22500%22%3E%3Crect width=%22400%22 height=%22500%22 fill=%22%23eadbd4%22/%3E%3C/svg%3E';

export default async function InvitationStudioSliceDFixturePage({
  searchParams,
}: {
  searchParams?: Promise<{ mode?: string | string[] }>;
}) {
  const query = await (searchParams ?? Promise.resolve<{ mode?: string | string[] }>({}));
  const content = createDefaultInvitationDraftContent({
    default_timezone: 'Asia/Jakarta',
    event_date_primary: '2027-06-12',
    person_one_name: 'Nadia',
    person_two_name: 'Raka',
  });
  const initialDraft: InvitationDraft = {
    content: {
      ...content,
      audio: {
        assetId: audioId,
        durationSeconds: 185,
        originalFileName: 'lagu-kita.mp3',
        rightsAcknowledged: true,
      },
      gallery: {
        enabled: true,
        imageIds: [firstImageId, secondImageId],
      },
    },
    created_at: '2026-08-06T00:00:00.000Z',
    deleted_at: null,
    id: '55555555-5555-4555-8555-555555555555',
    project_id: projectId,
    schema_version: 1,
    updated_at: '2026-08-06T00:00:00.000Z',
  };
  const initialImages: InvitationGalleryImage[] = [
    { alt: 'Foto pertama', id: firstImageId, src: imagePlaceholder },
    { alt: 'Foto kedua', id: secondImageId, src: imagePlaceholder },
  ];
  const initialAudio: InvitationAudioSummary = {
    durationSeconds: 185,
    id: audioId,
    mimeType: 'audio/mpeg',
    originalFileName: 'lagu-kita.mp3',
    sizeBytes: 2_097_152,
  };

  return (
    <main className="bg-seraya-canvas min-h-screen px-0 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-[96rem]">
        <InvitationStudioSliceDFixture
          initialAudio={initialAudio}
          initialDraft={initialDraft}
          initialImages={initialImages}
          initialMode={parseInvitationStudioMode(query.mode ?? 'media')}
          projectId={projectId}
        />
      </div>
    </main>
  );
}
